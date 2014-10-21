var width = 1000,
    height = 600,
    format = d3.format(",d"),
    root,
    allNodes = [];

var color = d3.scale.quantize().domain([0, 3]).range(colorbrewer.PiYG[11]);
var radius = d3.scale.sqrt()
    .range([10, 60]);

var zoom = d3.behavior.zoom()
    .scaleExtent([1, 500])
    .on("zoom", zoomed);

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height)
    .call(zoom);

var containter = svg.append("g");
var linkGroup = containter.append("g");
var nodeGroup = containter.append("g");
var link = linkGroup.selectAll(".link");
var node = nodeGroup.selectAll(".node");

var force = d3.layout.force()
    .size([width, height])


var tree = d3.layout.tree()
    .size([width, height])
    .children(function(d){
        if(d.Categories) {
            return d.Categories;
        }
        if(d.Features) {
            return d.Features;
        }
        if(d.Segments) {
            //return [{"Name" : d.Name, "NodeID": Math.random()*89999}];
        }
        else return null;
    });
var fullTree = d3.layout.tree()
    .children(function(d) {
        if(d.Categories) {
            return d.Categories;
        }
        if(d.Features) {
            return d.Features;
        }
        if(d.Segments) {
            return d.Segments;
        }
        else return null;
    });

var subTree = d3.layout.tree()
    .size([width, height])
    .children(function (d) {
        if(d.Segments) {
            return d.Segments;   
        }
        else return null;
    });

var pack = d3.layout.pack()
    .children(function(d) {
        if(d.Segments)
            return d.Segments;
    })
    .value(function(d) {
        return d.MutualInformation; 
    });

d3.json("pred2.json", function(error, json) {
    root = json;
    update();
    
});

function update() {
    var focus = root, view;
    var nodes = tree.nodes(root).reverse();
    var links = tree.links(nodes);

    var mutualMin = d3.min(nodes, function(d){ return d.MutualInformation; });
    var mutualMax = d3.max(nodes, function(d){ return d.MutualInformation; });
    var liftMin = d3.min(nodes, function(d){ 
        return d.Lift || 1; });
    var liftMax = d3.max(nodes, function(d){ 
        return d.Lift || 1; });
    
    radius.domain([mutualMin, mutualMax]);
    
    var charge = -900//(1000 - (nodes.length * 6)) * -1;
    
    force.nodes(nodes)
        .links(links)
        .on("tick", tick)
        .charge(-400)
        //.friction(.05)
        .gravity(.1)
        .linkDistance(function(d) {
            return radius(d.source.MutualInformation) + radius(d.target.MutualInformation);
        })
        .start();
    
    link = link.data(links, function(d) {
        return d.source.NodeID + "_" + d.target.NodeID
    })
        
    linkEnter = link.enter().append("g")
        .attr("class", "link");

    linkEnter.append("line")

    link.exit().remove();

    node = node.data(nodes, function(d) {
        return d.NodeID;
    })
    .on("click", function(d) { if (focus !== d) zoom(d), d3.event.stopPropagation(); });
        
    nodeEnter = node.enter().append("g")
        .attr("class", "node").call(force.drag);

    nodeEnter.append("circle")
        
    node.select(".node circle")
        .attr("r", function(d) { 
            if(d.MutualInformation) {
                return radius(d.MutualInformation);
            }
            return 0
        })
        .attr("class", function(d) {
            var depthClass = ["d-0", "d-1", "d-2", "d-3"];
            if(d.depth <= depthClass.length)
                return depthClass[d.depth];
            else return "";
        })
        .on("mouseenter", function(d) { tooltipUpdate(d); })
        .on("mouseleave", function(d) { tooltipClear(); });
    
    nodeEnter.append("text")
        .attr("dy", ".35em")
        .attr("text-anchor", "middle");
    
    node.select(".node text").text(function(d) {
        if(d.depth===2)
                return "";
            return d.Name; 
        });
    

    
    node.exit().remove();
    
    var subNode = node.selectAll(".segment")
    .data(function(d) {
        if(d.Segments){
            var rad = radius(d.MutualInformation);
            var size = [rad*2, rad*2];
            return pack.size(size)(d);
        }
        else return [];
    })
    .enter().append("g")
        .attr("class", function(d) {
            if(d.depth === 1){
                return "segment";
            }
            return "parent-cluster";
        })
        .attr("transform", function(d) { 
            if(!isNaN(d.x) && !isNaN(d.y) && d.depth > 0 && !isNaN(d.parent.x) && !isNaN(d.parent.y) ) {
                var xTrans = d.parent.x - d.x;
                var yTrans = d.parent.y - d.y;
                return "translate(" + xTrans  + "," + yTrans  + ")"; 
            }
        })
        .style("fill", function(d) {
            if(d.depth > 0) {
                return color(d.Lift);
            }
        })
        .on("mouseenter", function(d) { tooltipUpdate(d); })
        .on("mouseleave", function(d) { tooltipClear(); });;

    subNode.append("circle")
        .attr("r", function(d) {
            if(!isNaN(d.r))
                return d.r; 
        });

    function tick() {
        link.selectAll("line")
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node.attr("transform", function(d) {
            var info = d.MutualInformation || 0;
            d.x = Math.max(radius(info), Math.min(width - radius(info), d.x));
            d.y = Math.max(radius(info), Math.min(height - radius(info), d.y));
            return "translate(" + d.x + "," + d.y + ")";
        })
    };
};

function zoomed() {
  containter.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
};

function tooltipUpdate(d) {
    $(".tip .name").text(d.Name);
    $(".tip .lift").text(d.Lift);
    $(".tip .freq").text(d.MutualInformation);
    $(".tip .p-name").text(d.parent.Name);
};

function tooltipClear(){
    $(".tip .name").text("");
    $(".tip .lift").text("");
    $(".tip .freq").text("");
    $(".tip .p-name").text("");
};

$(".filter-button.one").click(function(e) {
    removeRand(1);
});

$(".filter-button.ten").click(function(e) {
    removeRand(10);
});

$(".top-10.lift").click(function(e) {
    if(allNodes.length === 0) {
         allNodes = fullTree.nodes(root);
    }
    allNodes.sort(function(a,b) {
        if(a.Lift && b.Lift)
            return parseFloat(b.Lift) - parseFloat(a.Lift);
        if(a.Lift) 
            return -1;
        if(b.Lift)
            return 1;
        return 0;
    });
    d3.selectAll(".segment circle")
        .filter(function(d) {
            for(var i=0; i<10; i++) {
                if(d.NodeID === allNodes[i].NodeID){
                    return false;
                }
            }
            return true;
        })
        .classed("diminish", true);
    var parentIDs = [];
    d3.selectAll(".node circle")
        .filter(function(d) {
            if(d.Segments){
                for(var i=0; i<d.Segments.length; i++) {
                    for(var j=0; j<10; j++) {
                        if(d.Segments[i].NodeID === allNodes[j].NodeID) {
                            parentIDs.push(d.NodeID);
                            return false;    
                        }
                    }
                }
                
                return true;
            } if(d.depth === 2) {
                return true;
            }
        })
        .classed("diminish", true)
        .each(function(n, e){
            d3.selectAll(".link line").filter(function(d) {
                if(d.source.NodeID === e.NodeID || d.target.NodeID === e.NodeID) {
                    return true;   
                }
                return false;
            })
            .classed("diminish", true);
        })
    
    d3.selectAll(".segment circle")
        .filter(function(d) {
            for(var i=0; i<parentIDs.length; i++) {
                if(d.parent.NodeID === parentIDs[i]) {
                    return true;   
                }
            }
            return false;
        })
        .classed("less", true);
});

$(".clear-filter").click(function (e) {
   d3.selectAll(".diminish").classed("diminish", false).classed("less", false);
});

function removeRand(a) {
    var count = a || 1;
    for(var i=0; i<count; i++){
        var fetLen = 1;
        while(fetLen < 3){
            var category = getRandomCategory();
            var fetLen = category.Features.length;
        }
        var n = Math.floor(Math.random() * fetLen);
        category.Features.splice(n, 1);
    }
    update();
}

function getRandomCategory() {
    var catLen = root.Categories.length;
    var m = Math.floor(Math.random() * catLen);
    return root.Categories[m];
}

