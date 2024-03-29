var graph = new joint.dia.Graph();

function getPortType(view, magnet) {
    var portName = magnet.getAttribute('port');
    var inIndex = view.model.get('inPorts').indexOf(portName);
    if (inIndex > -1) return 'IN';
    var outIndex = view.model.get('outPorts').indexOf(portName);
    if (outIndex > -1) return 'OUT';
}

// http://stackoverflow.com/questions/30223776/in-jointjs-how-can-i-restrict-the-number-of-connections-to-each-input-to-just-o
function isPortInUse(cellView, magnet, linkView) {
    var links = graph.getLinks(cellView);
    for (var i = 0; i < links.length; i++) {
        if (linkView && linkView == links[i].findView(paper)) continue;
        if ((( cellView.model.id == links[i].get('source').id ) && ( magnet.getAttribute('port') == links[i].get('source').port) ) ||
            (( cellView.model.id == links[i].get('target').id ) && ( magnet.getAttribute('port') == links[i].get('target').port) ))
            return true
    }
    return false;
}

// TODO add cycle detection in graph
function hasCycle() {
    //graph.toGraphLib(); // TODO read http://jointjs.com/rappid/docs/layout/directedGraph
    //needs graphlib: https://github.com/cpettitt/graphlib/releases
    return false;
}

var paper = new joint.dia.Paper({
    el: $('#paper'),
    gridSize: 1,
    model: graph,
    snapLinks: true,
    defaultLink: new flink.Link, // http://stackoverflow.com/questions/24794263/jointjs-creating-custom-shapes-and-specifying-their-default-link
    linkPinning: false,
    // validate* -> return true if it may be used
    validateMagnet: function (cellView, magnet) {
        var portType = getPortType(cellView, magnet);
        if (portType == 'OUT') return true; //output may be used several times
        return !isPortInUse(cellView, magnet);
    },
    validateConnection: function (sourceView, sourceMagnet, targetView, targetMagnet, end, linkView) {
        if (sourceView == targetView) return false; //disallow link to self
        if (hasCycle()) return false;
        var sourcePortType = getPortType(sourceView, sourceMagnet);
        if (sourcePortType == 'IN' && isPortInUse(sourceView, sourceMagnet, linkView)) return false; //output may be used several times
        var targetPortType = getPortType(targetView, targetMagnet);
        if (targetPortType == 'IN' && isPortInUse(targetView, targetMagnet, linkView)) return false;
        return sourcePortType != targetPortType;
    }
});

function createSimple(inCnt, outCnt, label) {
    var portsIn = _.range(inCnt).map(function (a) {
        return "IN" + a;
    });
    var portsOut = _.range(outCnt).map(function (a) {
        return "OUT" + a;
    });
    return new flink.Atomic({
        position: {x: 0, y: 0},
        inPorts: portsIn,
        java: "package blab.ablab.alba\nimport stuff",
        outPorts: portsOut,
        attrs: {
            '.label': {text: label}
        }
    })
}

cellTypes = {
    'input': function () {
        return createSimple(0, 1, 'Input')
    },
    'map': function () {
        return createSimple(1, 1, 'Map')
    },
    'filter': function () {
        return createSimple(1, 1, 'Filter')
    },
    'join': function () {
        return createSimple(2, 1, 'Join')
    },
    'sink': function () {
        return createSimple(1, 0, 'Sink')
    },
    'reduce': function() {
        return createSimple(1, 1, 'Reduce')
    }
};

paper.on('cell:contextmenu', function(cellView, e) {
    cellView.model.remove();
    e.preventDefault();
});

$('.creator').on('click', function (evt) {
    var type = $(evt.target).data('type');
    newCell = cellTypes[type]();
    graph.addCell(newCell);
});

$('.jsonout').on('click', function () {
    console.log(JSON.stringify(graph.toJSON()));
});

$('.clear').on('click', function () {
    graph.clear();
});

// Remnants of the demo I used as a source
var connect = function (source, sourcePort, target, targetPort) {
    var link = new flink.Link({
        source: {id: source.id, selector: source.getPortSelector(sourcePort)},
        target: {id: target.id, selector: target.getPortSelector(targetPort)}
    });
    link.addTo(graph).reparent();
};

var c1 = new flink.Atomic({
    position: {x: 230, y: 150},
    size: {width: 300, height: 300},
    inPorts: ['in'],
    outPorts: ['out 1', 'out 2']
});

var a2 = new flink.Atomic({
    position: {x: 50, y: 260},
    outPorts: ['out']
});

var a3 = new flink.Atomic({
    position: {x: 650, y: 150},
    size: {width: 100, height: 300},
    inPorts: ['a', 'b']
});


graph.addCells([c1, a2, a3]);


connect(a2, 'out', c1, 'in');
connect(c1, 'out 1', a3, 'a');
connect(c1, 'out 2', a3, 'b');

/* rounded corners */
_.each([c1, a2, a3], function (element) {
    element.attr({'.body': {'rx': 6, 'ry': 6}});
});

/* custom highlighting */

var highlighter = V('circle', {
    'r': 14,
    'stroke': '#ff7e5d',
    'stroke-width': '6px',
    'fill': 'transparent',
    'pointer-events': 'none'
});

// this overrides how the port is marked
paper.off('cell:highlight cell:unhighlight').on({
    'cell:highlight': function (cellView, el, opt) {

        if (opt.embedding) {
            V(el).addClass('highlighted-parent');
        }

        if (opt.connecting) {
            var bbox = V(el).bbox(false, paper.viewport);
            highlighter.translate(bbox.x + 10, bbox.y + 10, {absolute: true});
            V(paper.viewport).append(highlighter);
        }
    },

    'cell:unhighlight': function (cellView, el, opt) {

        if (opt.embedding) {
            V(el).removeClass('highlighted-parent');
        }

        if (opt.connecting) {
            highlighter.remove();
        }
    }
});