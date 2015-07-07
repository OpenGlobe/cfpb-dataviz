/*
 * d3 elements (https://bitbucket.org/artstr/d3elements.git)
 * Copyright 2014 Artana Pty Ltd
 * Licensed under MIT (https://bitbucket.org/artstr/d3elements/src/master/LICENSE)
 */
/* global d3: true */
//
// flowChord
//
// A reusable d3 element
// Approach based on http://bost.ocks.org/mike/chart/
// 
// Requires a matrix of flows (an array of arrays).
// Assumes the rows and columns represent different concepts
// The matrix should have row and column headers, which are taken as the labels for the arcs.
// Rows appear on the right, columns on the left of the circle, with the flows
// shown connecting them.  (Use .flip() to transpose the rows and columns.)
// Hovering dims other flows, and optionally shows a popup with provided html.
// Eg.:
//
// 	var chordDiagram = d3.elts.flowChord(); // append options eg. .width(500).flip() etc - see getters and setters list at end
// 	var data = [['Eye colour','Introvert','Extrovert'],['Brown eyes', 0.8, 0.2],['Blue eyes', 0.4, 0.6],['Green eyes', 0.66, 0.34]];
// 	d3.select("body").datum(data).call(chordDiagram);
//
// TODO: allow colors of rows and columns to be set separately
//       change hoverHtml structure (currently keyed off the labels) in case rows and columns have the same label
//

var d3 = (function (d3) {
	'use strict';
	// requires d3
	// adds d3.elts.flowChord

	function flowChord() {
		// call this using selection.call(flowChord); (or just flowChord())
		var margin = {top: 50, right: 50, bottom: 50, left: 50}, // leaves room for labels
			width = 960,
			height = 500,
			arcPadding = 0,
			flip = null,  // append .flip() to transpose the matrix
			hoverFadeOpacity = 0.2,
			colors = d3.scale.category20b(),
			rimWidth = function(outerRadius) {return outerRadius*0.1}, // or use a constant
			hoverHtml = {}, // an object keyed off the row and column labels
			hoverOffset = {top: 60, left: 50},
			svgClass = "chord-diagram",
			hoverClass = "chord-hover",
	    	minAngleForLabel = 0;

		function transpose(A) {
			return A[0].map(function(col, i) { 
				return A.map(function(row) { 
					return row[i];
				});
			});
		}

		function expandedMatrix(A) {
			// given an n x m matrix A, convert to an (n+m) x (n+m) matrix
			// with A in the top right corner and A.transpose in the bottom left corner
			var n = A.length,
					m = A[0].length;
			var big = [];
			for (var i = 0; i < n+m; i++) {
				var row = [];
				for (var j = 0; j < n+m; j++) {
					if ((j>=n) && (i<n)) { 
						row.push(A[i][j-n]); 
					} else {
						if ((j<n) && (i>=n)) { 
							row.push(A[j][i-n]);
						} else {
							row.push(0); 
						}
					}
				}
				big.push(row);
			}
			return big;
		}

		// Returns an event handler for fading a given chord group.
		function fade(svg, opacity) {
			return function(g, i) {
				svg.selectAll(".flows path")
						.filter(function(d) { return d.source.index !== i && d.target.index !== i; })
					.transition()
						.style("opacity", opacity);
			};
		}
		
		function showHover (hoverDiv, d, label) {
			var html = hoverHtml[label];
			if (!html) {
				html = label;
			}
			hoverDiv
				.html(html)
				.style("top", function () { 
					return Math.min((d3.event.pageY - hoverOffset.top), Math.max(5,window.innerHeight-hoverDiv[0][0].offsetHeight))+"px";
				})
				.style("left", function () { 
					return (d3.event.pageX + (d.angle > Math.PI ? -hoverDiv[0][0].offsetWidth-hoverOffset.left : hoverOffset.left))+"px";
				}) 
				.style("visibility", "visible")
				.style("opacity", 1e-6)
				.transition()
					.style("opacity", 1);
		}

		function hideHover (hoverDiv) {
			hoverDiv
				.transition()
					.style("opacity", 1e-6);
					//.style("visibility", "hidden");
		}


		function chart(selection) {
			selection.each(function(data) {
				// generates chart, using width & height etc; 'data' is the data and 'this' is the element
				if (flip) {
					data = transpose(data);
				}
				// take off the labels
				var subMatrix = data.slice(1).map(function(row) { return row.slice(1).map(function(elt) { return +elt }); });
				var colLabels = data[0].slice(1);
				var rowLabels = data.slice(1).map(function(row) { return row[0] });
				var labelText = rowLabels.concat(colLabels); // TODO: check
				var flowMatrix = expandedMatrix(subMatrix);
				var chord = d3.layout.chord()
					.padding(arcPadding)
					.sortSubgroups(function() { return 1; })
					.matrix(flowMatrix);

				var outerRadius = (Math.min(width-margin.left-margin.right, height-margin.top-margin.bottom)/2);
				// Note d3.functor allows for constants or functions
				//  - see https://github.com/mbostock/d3/wiki/Internals#functor
				var innerRadius = outerRadius - d3.functor(rimWidth)(outerRadius);
				
				// Make the hover svg element if needed
				var hoverDiv = d3.select(this).selectAll("div."+hoverClass).data(["TBD"]);
				hoverDiv.enter().append("div").attr("class",hoverClass);

				// Select the svg element, if it exists.
				var svg = d3.select(this).selectAll("svg."+svgClass).data([data]);

				// Otherwise, create the svg and the g which translates the chord diagram properly.
				var gEnter = svg.enter()
								.append("svg").attr("class",svgClass)
									.append("g");
				gEnter.append("g").attr("class", "rim");
				gEnter.append("g").attr("class", "labels");
				gEnter.append("g").attr("class", "flows");

				svg .attr("width", width)
					.attr("height", height);

				// Update the location
				svg.select("g")
					.attr("transform", "translate("+(width+margin.left-margin.right)/2+","+(height+margin.top-margin.bottom)/2+")");

				var rim = svg.select("g.rim")
					.selectAll("path")
					.data(chord.groups);
				rim.enter().append("path");
				rim.style("fill", function(d) { return colors(d.index); })
					.style("stroke", function(d) { return colors(d.index); })
					.attr("d", d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius))
					.on("mouseover", function(d,i) {showHover(hoverDiv, d, labelText[d.index]); return fade(svg, hoverFadeOpacity)(d,i)})
					.on("mouseout", function(d,i) {hideHover(hoverDiv); return fade(svg, 1)(d,i)});

				var labels = svg.select("g.labels")
					.selectAll("text")
					.data(chord.groups);
				labels.enter().append("text");
				labels.attr("class", "labels")
					.each(function(d) { d.angle = (d.startAngle + d.endAngle) / 2; })
					.attr("dy", ".35em")
					.attr("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
					.attr("transform", function(d) {
						return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")" +
						"translate(" + (outerRadius + 6) + ")" +
						(d.angle > Math.PI ? "rotate(180)" : "");
					})
					.attr("class", function(d) {return d.index<rowLabels.length ? "row" : "column"})
					.text(function(d) { if ((d.endAngle-d.startAngle)>minAngleForLabel) return labelText[d.index]; }); 

				var flows = svg.select("g.flows")
					.selectAll("path")
					.data(chord.chords);
				flows.enter().append("path");
				flows.attr("d", d3.svg.chord().radius(innerRadius))
					.style("fill", function(d) { return colors(d.target.index); })
					.style("opacity", 1);
			});
		}

		// getters and setters

		chart.margin = function(_) {
			if (!arguments.length) return margin;
			margin = _;
			return chart;
		};

		chart.width = function(_) {
			if (!arguments.length) return width;
			width = _;
			return chart;
		};

		chart.height = function(_) {
			if (!arguments.length) return height;
			height = _;
			return chart;
		};

		chart.arcPadding = function(_) {
			if (!arguments.length) return arcPadding;
			arcPadding = _;
			return chart;
		};

		chart.rimWidth = function(_) {
			if (!arguments.length) return rimWidth;
			rimWidth = _;
			return chart;
		};

		chart.colors = function(_) {
			if (!arguments.length) return colors;
			colors = _;
			return chart;
		};

		chart.flip = function() {
			// include chart.flip() to transpose the data before plotting
			flip = true;
			return chart;
		};

		chart.minAngleForLabel = function(_) {
			if (!arguments.length) return minAngleForLabel;
			minAngleForLabel = _;
			return chart;
		};

		chart.hoverFadeOpacity = function(_) {
			if (!arguments.length) return hoverFadeOpacity;
			hoverFadeOpacity = _;
			return chart;
		};

		chart.hoverHtml = function(_) {
			if (!arguments.length) return hoverHtml;
			hoverHtml = _;
			return chart;
		};

		chart.hoverOffset = function(_) {
			if (!arguments.length) return hoverOffset;
			hoverOffset = _;
			return chart;
		};

		chart.svgClass = function(_) {
			if (!arguments.length) return svgClass;
			svgClass = _;
			return chart;
		};

		chart.hoverClass = function(_) {
			if (!arguments.length) return hoverClass;
			hoverClass = _;
			return chart;
		};

		return chart;
	}

	// attach to d3.elts
	if (typeof d3.elts==="undefined") {
		d3.elts = {};
	}
	d3.elts.flowChord = flowChord;
	return d3;

}(d3));
