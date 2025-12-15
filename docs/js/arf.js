// Responsive dimensions based on viewport
function getResponsiveDimensions() {
    var viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    var isMobile = viewportWidth < 768;

    // Adjust margins for mobile
    var marginTop = isMobile ? 10 : 20;
    var marginRight = isMobile ? 60 : 120;
    var marginBottom = isMobile ? 10 : 20;
    var marginLeft = isMobile ? 80 : 140;

    // Make SVG larger than viewport to allow scrolling
    // Multiply dimensions to accommodate expanded tree
    var widthMultiplier = isMobile ? 3 : 2;
    var heightMultiplier = isMobile ? 4 : 2;

    return {
        margin: [marginTop, marginRight, marginBottom, marginLeft],
        width: (viewportWidth - marginRight - marginLeft) * widthMultiplier,
        height: Math.max((viewportHeight - 200) * heightMultiplier, 1200),
        isMobile: isMobile
    };
}

var dimensions = getResponsiveDimensions();
var margin = dimensions.margin,
    width = dimensions.width,
    height = dimensions.height,
    i = 0,
    duration = 1250,
    root;

var tree = d3.layout.tree()
    .size([height, width]);

var diagonal = d3.svg.diagonal()
    .projection(function(d) { return [d.y, d.x]; });

var vis = d3.select("#svg-container").append("svg:svg")
    .attr("width", width + margin[1] + margin[3])
    .attr("height", height + margin[0] + margin[2])
    .style("display", "block")
    .style("min-width", "100%")
    .style("min-height", "100%")
  .append("svg:g")
    .attr("transform", "translate(" + margin[3] + "," + margin[0] + ")");

d3.json("arf.json", function(json) {
  root = json;
  root.x0 = height / 2;
  root.y0 = 0;

  function collapse(d) {
    if (d.children) {
      d._children = d.children;
      d._children.forEach(collapse);
      d.children = null;
    }
  }

/*  function toggleAll(d) {
    if (d.children) {
      d.children.forEach(toggleAll);
      toggle(d);
    }
  } */
  root.children.forEach(collapse);
  update(root);
});

function update(source) {
  // var duration = d3.event && d3.event.altKey ? 5000 : 500;

  // Compute the new tree layout.
  var nodes = tree.nodes(root).reverse();

  // Normalize for fixed-depth (responsive spacing for mobile).
  var depthSpacing = dimensions.isMobile ? 120 : 180;
  nodes.forEach(function(d) { d.y = d.depth * depthSpacing; });

  // Update the nodes…
  var node = vis.selectAll("g.node")
      .data(nodes, function(d) { return d.id || (d.id = ++i); });

  // Enter any new nodes at the parent's previous position.
  var nodeEnter = node.enter().append("svg:g")
      .attr("class", "node")
      .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; });

  // Helper function to get node color based on type
  function getNodeColor(d) {
    if (!d.name) return "steelblue";
    var name = d.name;
    if (name.includes("(T)")) return "#8B5CF6"; // Purple for tools
    if (name.includes("(D)")) return "#10B981"; // Green for dorks
    if (name.includes("(R)")) return "#F59E0B"; // Orange for registration
    if (name.includes("(M)")) return "#EF4444"; // Red for manual
    return "steelblue"; // Default blue
  }

  nodeEnter.append("svg:circle")
      .attr("r", 1e-6)
      .style("fill", function(d) {
        if (d._children) return "lightsteelblue";
        return getNodeColor(d);
      })
      .style("stroke", "#fff")
      .style("stroke-width", "2px")
      .on("click", function(d) {
        d3.event.stopPropagation();
        // If node has URL and no children, open URL in new tab
        if (d.url && !d.children && !d._children) {
          window.open(d.url, '_blank');
        } else {
          // Otherwise toggle expand/collapse
          toggle(d);
          update(d);
        }
      })
      .on("touchstart", function(d) {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        // If node has URL and no children, open URL in new tab
        if (d.url && !d.children && !d._children) {
          window.open(d.url, '_blank');
        } else {
          // Otherwise toggle expand/collapse
          toggle(d);
          update(d);
        }
      });

  // Add text with proper link handling
  var textElement = nodeEnter.append('a')
      .attr("target", "_blank")
      .attr('xlink:href', function(d) {
        // Only set href for end nodes with URLs
        return (d.url && !d.children && !d._children) ? d.url : null;
      })
      .append("svg:text")
      .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
      .attr("dy", ".35em")
      .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
      .text(function(d) { return d.name; })
      .style("fill", function(d) { return getNodeColor(d); })
      .style("font-weight", "bold")
      .style("fill-opacity", 1e-6);

  // Add click handler for non-end nodes to toggle
  textElement.on("click", function(d) {
    // If this is not an end node, toggle it
    if (d.children || d._children) {
      d3.event.preventDefault();
      d3.event.stopPropagation();
      toggle(d);
      update(d);
    }
    // For end nodes with URLs, the link will work naturally
  });

  nodeEnter.append("svg:title")
    .text(function(d) {
      return d.description;
    });

  // Transition nodes to their new position.
  var nodeUpdate = node.transition()
      .duration(duration)
      .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

  nodeUpdate.select("circle")
      .attr("r", dimensions.isMobile ? 8 : 6)
      .style("fill", function(d) {
        if (d._children) return "lightsteelblue";
        return getNodeColor(d);
      })
      .style("stroke", "#fff")
      .style("stroke-width", "2px");

  nodeUpdate.select("text")
      .style("fill", function(d) { return getNodeColor(d); })
      .style("fill-opacity", 1);

  // Transition exiting nodes to the parent's new position.
  var nodeExit = node.exit().transition()
      .duration(duration)
      .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
      .remove();

  nodeExit.select("circle")
      .attr("r", 1e-6);

  nodeExit.select("text")
      .style("fill-opacity", 1e-6);

  // Update the links…
  var link = vis.selectAll("path.link")
      .data(tree.links(nodes), function(d) { return d.target.id; });

  // Enter any new links at the parent's previous position.
  link.enter().insert("svg:path", "g")
      .attr("class", "link")
      .attr("d", function(d) {
        var o = {x: source.x0, y: source.y0};
        return diagonal({source: o, target: o});
      })
    .transition()
      .duration(duration)
      .attr("d", diagonal);

  // Transition links to their new position.
  link.transition()
      .duration(duration)
      .attr("d", diagonal);

  // Transition exiting nodes to the parent's new position.
  link.exit().transition()
      .duration(duration)
      .attr("d", function(d) {
        var o = {x: source.x, y: source.y};
        return diagonal({source: o, target: o});
      })
      .remove();

  // Stash the old positions for transition.
  nodes.forEach(function(d) {
    d.x0 = d.x;
    d.y0 = d.y;
  });
}

// Toggle children.
function toggle(d) {
  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;
  }
}
//Toggle Dark Mode
function goDark() {
  var element = document.body;
  element.classList.toggle("dark-Mode");
}

// Handle window resize for responsive behavior
var resizeTimer;
window.addEventListener('resize', function() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function() {
    // Debounce resize events
    var newDimensions = getResponsiveDimensions();

    // Update dimensions
    width = newDimensions.width;
    height = newDimensions.height;
    margin = newDimensions.margin;

    // Update tree size
    tree.size([height, width]);

    // Update SVG size
    d3.select("#svg-container svg")
      .attr("width", width + margin[1] + margin[3])
      .attr("height", height + margin[0] + margin[2]);

    // Update transform
    vis.attr("transform", "translate(" + margin[3] + "," + margin[0] + ")");

    // Re-render tree if root exists
    if (root) {
      root.x0 = height / 2;
      root.y0 = 0;
      update(root);
    }
  }, 250);
});

// Get node category based on name
function getNodeCategory(d) {
  if (!d.name) return "NONE";
  var name = d.name;
  if (name.includes("(T)")) return "T";
  if (name.includes("(D)")) return "D";
  if (name.includes("(R)")) return "R";
  if (name.includes("(M)")) return "M";
  return "NONE";
}

// Apply filters based on selected checkboxes
function applyFilters() {
  // Get selected filters
  var selectedFilters = [];
  if (document.getElementById("filter-tool").checked) selectedFilters.push("T");
  if (document.getElementById("filter-dork").checked) selectedFilters.push("D");
  if (document.getElementById("filter-registration").checked) selectedFilters.push("R");
  if (document.getElementById("filter-manual").checked) selectedFilters.push("M");
  if (document.getElementById("filter-none").checked) selectedFilters.push("NONE");

  // Apply filters to all nodes
  vis.selectAll("g.node").each(function(d) {
    var category = getNodeCategory(d);
    var shouldShow = selectedFilters.indexOf(category) !== -1;

    // Show or hide the node
    d3.select(this).style("display", shouldShow ? "inline" : "none");
  });

  // Apply filters to links
  vis.selectAll("path.link").each(function(d) {
    var sourceCategory = getNodeCategory(d.source);
    var targetCategory = getNodeCategory(d.target);
    var shouldShow = (selectedFilters.indexOf(sourceCategory) !== -1) &&
                     (selectedFilters.indexOf(targetCategory) !== -1);

    // Show or hide the link
    d3.select(this).style("display", shouldShow ? "inline" : "none");
  });
}