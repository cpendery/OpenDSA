(function ($) {
	var jsav = new JSAV("av"),
		saved = false,
		selectedNode = null,
		g,
		grammar;

  	var variables = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	//Empty string can be set to anything when initializing the graph:
	//e.g. initGraph({layout: "automatic", emptystring: epsilon})
	//By default it is set to lambda.
	var lambda = String.fromCharCode(955),
		epsilon = String.fromCharCode(949),
		emptystring = lambda;
	
	var initGraph = function(opts) {
		g = jsav.ds.fa($.extend({width: '90%', height: 440}, opts));
		var gWidth = g.element.width(),
			gHeight = g.element.height();
  		var a = g.addNode({left: 0.15 * gWidth, top: 0.87 * gHeight}),		
      		b = g.addNode({left: 0.45 * gWidth, top: 0.87 * gHeight}),
      		c = g.addNode({left: 0.75 * gWidth, top: 0.87 * gHeight});
      	g.makeInitial(a);
      	c.addClass('final');
      	var startVar = grammar[0][0];
      	g.addEdge(a, b, {weight: emptystring + ':Z:' + startVar + 'Z'});
      	g.addEdge(b, c, {weight: emptystring + ':Z:' + emptystring});

      	for (var i = 0; i < grammar.length; i++) {
      		g.addEdge(b, b, {weight: emptystring + ':' + grammar[i][0] + ':' + grammar[i][1]})
      	}
      	for (var i = 0; i < grammar.length; i++) {
      		var t = grammar[i][1].split("");
      		for (var j = 0; j < t.length; j++) {
      			if (variables.indexOf(t[j]) === -1 && t[j] !== emptystring) {
      				g.addEdge(b, b, {weight: t[j] + ':' + t[j] + ':' + emptystring});
      			}
      		}
      	}
	
  //   	$(".jsavgraph").click(graphClickHandler);
  //   	g.click(nodeClickHandler);
		// g.click(edgeClickHandler, {edge: true});
		// $('.jsavedgelabel').click(labelClickHandler);
		return g;
    };

    var labelClickHandler = function(e) {
		if ($(".jsavgraph").hasClass("editNodes") && !$(".jsavgraph").hasClass("working")) {
				$(".jsavgraph").addClass("working");
			var self = this;
				var values = $(this).html().split('<br>');
				var createForm = '<form id="editedgelabel"><select class="labelmenu" id="edgelabelselect" size="' + values.length + '">'
				for (var i = 0; i < values.length; i++) {
					createForm += '<option>' + values[i] + '</option>';
				}
				createForm += '</select><br><input type="button" class="labelmenu" id="changetransitionbutton" value="Change transition"><input type="button" class="labelmenu" id="deletetransitionbutton" value="Delete transition"><input type="button" class="labelmenu" id="donelabelbutton" value="Done"></form>'
			$(createForm).appendTo($('.jsavgraph'));
			var xBound = $('.jsavgraph').offset().left + $('.jsavgraph').width(),
				yBound = $('.jsavgraph').offset().top + $('.jsavgraph').height(),
				xOffset = e.pageX,
				yOffset = e.pageY,
				xWidth = $('#editedgelabel').width(),
				yHeight = $('#editedgelabel').height();
			if (xBound < xOffset + xWidth) {
				xOffset -= xWidth;
			}
			if (yBound < yOffset + yHeight) {
				yOffset -= yHeight;
			}
			$('#editedgelabel').offset({top: yOffset, left: xOffset});
			var changeTransition = function() {
				var x = document.getElementById("edgelabelselect").selectedIndex;
				if (x !== -1) {
					var y = document.getElementById('edgelabelselect').options[x].text;
					var n = prompt("New transition label?", y);
					if (n) {
						var nSplit = n.split(':');
						for (var i = 0; i < nSplit.length; i++) {
							if (nSplit[i] === "") {
								nSplit[i] = emptystring;
							}
						}
						n = nSplit.join(':');
						document.getElementById('edgelabelselect').options[x].innerHTML = n;
					}
				}
			};
			var deleteTransition = function() {
				var x = document.getElementById('edgelabelselect').selectedIndex;
				if (x !== -1) {
					document.getElementById('edgelabelselect').remove(x);
					document.getElementById('edgelabelselect').size--;
					if (document.getElementById('edgelabelselect').size === 0) {
						$('#donelabelbutton').trigger("click");
					}
				}
			};
			var finishEdgeLabel = function() {
				var newVal = [];
				for (var j = 0; j < $('#edgelabelselect > option').length; j++) {
					newVal.push(document.getElementById('edgelabelselect').options[j].text);
				}
				newVal = newVal.join('<br>');
				$(self).html(newVal);
				$('#editedgelabel').remove();
				g.layout({layout: "manual"});
				$('.jsavgraph').removeClass("working");
				updateAlphabet();
			};
			$('#changetransitionbutton').click(changeTransition);
			$('#deletetransitionbutton').click(deleteTransition);
			$('#donelabelbutton').click(finishEdgeLabel);
		}
		};
		var graphClickHandler = function(e) {
		if ($(".jsavgraph").hasClass("addNodes")) {
			var newNode = g.addNode(),
			    nodeX = newNode.element.width()/2.0,
				nodeY = newNode.element.height()/2.0;
			$(newNode.element).offset({top: e.pageY - nodeY, left: e.pageX - nodeX});
		} 
		else if ($('.jsavgraph').hasClass('moveNodes') && selectedNode != null) {
			var nodeX = selectedNode.element.width()/2.0,
				nodeY = selectedNode.element.height()/2.0,
				edges = g.edges();
			$(selectedNode.element).offset({top: e.pageY - nodeY, left: e.pageX - nodeX});
			selectedNode.stateLabelPositionUpdate();
			for (var next = edges.next(); next; next = edges.next()) {
				if (next.start().equals(selectedNode) || next.end().equals(selectedNode)) {
					next.layout();
				}
			}
			selectedNode.unhighlight();
			selectedNode = null;
			e.stopPropagation();
			jsav.umsg("Click a node");
		}
	};
	var nodeClickHandler = function(e) {	
		if ($(".jsavgraph").hasClass("editNodes")) {
			this.highlight();
			var input = prompt("Delete state, make state initial, make state final, or give state a label? d, i, f, or l");
			if (input === null) {
				this.unhighlight();
				return;
			}
			input = input.toUpperCase();
			if (input == 'D') {
				g.removeNode(this);
				updateAlphabet();
			}
			else if (input == 'I') {
				var nodes = g.nodes();
				for (var next = nodes.next(); next; next = nodes.next()) {
					g.removeInitial(next);
				}
				g.makeInitial(this);
			} else if (input == 'F') {
				this.toggleClass('final');
			} 
			//adds labels to states
			else if (input == 'L') {
				var input2 = prompt("Label?");
				if (input2 !== null) {
					this.stateLabel(input2);
					this.stateLabelPositionUpdate();
				}
			}
   			this.unhighlight();
			} else if ($(".jsavgraph").hasClass("addEdges")) {
				this.highlight();
				if (!$(".jsavgraph").hasClass("working")) {
				first = this;
				$('.jsavgraph').addClass("working");
				jsav.umsg("Select a node to make an edge to");
   			} else {
   				var input2 = prompt("Accepted character?");
   				var input3 = prompt('Stack symbol(s) to pop?');
   				var input4 = prompt('Stack symbol(s) to push?');
   				var newEdge;
   				if (!input2) {
   					input2 = emptystring;
   				}
   				if (!input3) {
   					input3 = emptystring;
   				}
   				if (!input4) {
   					input4 = emptystring;
   				}
   				var w = input2 + ':' + input3 + ':' + input4;
				if (input2 != null) {
					newEdge = g.addEdge(first, this, {weight: w});
					if (newEdge) {
						$(newEdge._label.element).click(labelClickHandler);
					}
				} 
				if (!(typeof newEdge === 'undefined')) {
					newEdge.layout();
				}
				$('.jsavgraph').removeClass("working");
				first.unhighlight();
				this.unhighlight();
				updateAlphabet();
				jsav.umsg("Click a node");
   			}
		} else if ($('.jsavgraph').hasClass('moveNodes')) {
			if (selectedNode) {
				selectedNode.unhighlight();
			}
			this.highlight();
			selectedNode = this;
			jsav.umsg("Click to place node");
			e.stopPropagation();
		}
	};
	var edgeClickHandler = function(e) {
		if ($('.jsavgraph').hasClass('editNodes')) {
			this.highlight();
			var input = confirm("Delete edge?");
			if (input === null) {
				this.unhighlight();
				return;
			}
			if (input) {
				g.removeEdge(this);
			}
			updateAlphabet();
			this.unhighlight();
		}
	};
	
	if (!localStorage['grammar']) {
		window.close();
	}
	grammar = _.map(localStorage['grammar'].split(','), function(x) {return x.split(String.fromCharCode(8594));});
    var g = initGraph({layout: "manual"});
		g.layout();
		jsav.displayInit();

		//===============================
		var updateAlphabet = function() {
			g.updateAlphabet();
		$("#alphabet").html("" + Object.keys(g.alphabet).sort());
		var sa = g.getStackAlphabet();
		$('#stackalphabet').html("Z," + _.without(sa.sort(), 'Z'));
	};
	updateAlphabet();
	//===============================
	//editing modes

	var addNodesMode = function() {
		removeEdgeSelect();
		removeLabelMenu();
		$(".jsavgraph").removeClass("working");
		$(".jsavgraph").removeClass("addEdges");
		$(".jsavgraph").removeClass("moveNodes");
		$(".jsavgraph").removeClass("editNodes");
		$(".jsavgraph").addClass("addNodes");
		$("#mode").html('Adding nodes');
		jsav.umsg("Click to add nodes");
	};
	var addEdgesMode = function() {
		removeEdgeSelect();
		removeLabelMenu();
		$(".jsavgraph").removeClass("working");
		$(".jsavgraph").removeClass("addNodes");
		$(".jsavgraph").removeClass("moveNodes");
		$(".jsavgraph").removeClass("editNodes");
		$(".jsavgraph").addClass("addEdges");
		$("#mode").html('Adding edges');
		jsav.umsg("Click a node");
	};
	var moveNodesMode = function() {
		removeEdgeSelect();
		removeLabelMenu();
		$(".jsavgraph").removeClass("working");
		$(".jsavgraph").removeClass("addNodes");
		$(".jsavgraph").removeClass("addEdges");
		$(".jsavgraph").removeClass("editNodes");
		$(".jsavgraph").addClass("moveNodes");
		$("#mode").html('Moving nodes');
		jsav.umsg("Click a node");
	};
	var editNodesMode = function() {
		$(".jsavgraph").removeClass("working");
		$(".jsavgraph").removeClass("addNodes");
		$(".jsavgraph").removeClass("addEdges");
		$(".jsavgraph").removeClass("moveNodes");
		$(".jsavgraph").addClass("editNodes");
		$("#mode").html('Editing nodes and edges');
		addEdgeSelect();
		jsav.umsg("Click a node or edge");
	};
	var changeEditingMode = function() {
		removeLabelMenu();
		$(".jsavgraph").removeClass("working");
		$(".jsavgraph").removeClass("addNodes");
		$(".jsavgraph").removeClass("addEdges");
		$(".jsavgraph").removeClass("moveNodes");
		$('.jsavgraph').removeClass('editNodes');
		removeEdgeSelect();
		$("#mode").html('Editing');
		if ($(".notEditing").is(":visible")) {
			$('#changeButton').html('Done editing');
		} else {
			$('#changeButton').html('Edit');
		}
		$('.notEditing').toggle();
		$('.editing').toggle();
	};

	var addEdgeSelect = function () {
		var edges = g.edges();
		for (var next = edges.next(); next; next= edges.next()) {
			next.addClass('edgeSelect');
			next.layout();
		}
	};
	var removeEdgeSelect = function () {
		var edges = g.edges();
		for (var next = edges.next(); next; next = edges.next()) {
			if (next.hasClass('edgeSelect')) {
				next.removeClass('edgeSelect');
				next.layout();
			}
		}
	};
	var removeLabelMenu = function() {
		if ($('#editedgelabel')) {
			$('#editedgelabel').remove();
		}
	};

	//====================
	//tests

	var testND = function() {
		$('#changeButton').toggleClass("highlightingND");
		if ($('#changeButton').hasClass("highlightingND") || $('#changeButton').hasClass("highlightingL")) {
			$('#changeButton').hide();
		} else{
			$('#changeButton').show();
		}
		var nodes = g.nodes();
		for(var next = nodes.next(); next; next = nodes.next()) {
			var edges = next.getOutgoing();
			if (edges.length === 0) {continue;}
			var weights = _.map(edges, function(e) {return e.weight().split('<br>')});
			for (var i = 0; i < weights.length; i++) {
				var findLambda = _.find(weights[i], function(e) {return e.split(':')[0] === emptystring});
				if (findLambda) { break; }
			}
			var dup = _.map(_.flatten(weights), function(e) {return _.initial(e.split(':')).join()})
			if (findLambda || _.uniq(dup).length < dup.length) {
				next.toggleClass('testingND');
			}
		}
	};
	var testLambda = function() {
		$('#changeButton').toggleClass("highlightingL");
		if ($('#changeButton').hasClass("highlightingND") || $('#changeButton').hasClass("highlightingL")) {
			$('#changeButton').hide();
		} else{
			$('#changeButton').show();
		}
		var edges = g.edges();
		for (var next = edges.next(); next; next = edges.next()) {
			var wSplit = next.weight().split('<br>');
			for (var i = 0; i < wSplit.length; i++) {
				if (_.every(wSplit[i].split(':'), function(x) {return x === emptystring})) {
					next.g.element.toggleClass('testingLambda');
					break;
				}
			}
		}
	};


	//====================
	//traversal

	var play = function() {
		if (!g.initial) {
			alert('Please define an initial state');
			return;
		}
		var inputString = prompt("Input string?", "aqvx");
		if (inputString === null) {
			return;
		}
		jsav.umsg("");
		var textArray = [];
		$("button").hide();			//disable buttons
		$("#mode").html('');
		$('.jsavcontrols').show();
		g.initial.addClass('current');
		var currentStates = [new Configuration(g.initial, ['Z'], inputString, 0)];
		currentStates = addLambdaClosure(currentStates);
		var configView = "";
	   	for (var j = 0; j < currentStates.length; j++) {
	   		configView += currentStates[j].toString() + ' | ';
	   	}
	    jsav.umsg(configView);
		var cur;
		
		jsav.displayInit();
		var counter = 0;
		var stringAccepted = false;
		while (true) {
			jsav.step();
			counter++;
			if (counter > 500) {
				break;
			}
			for (var j = 0; j < currentStates.length; j++) {
		   		currentStates[j].state.removeClass('current');
		   		currentStates[j].state.removeClass('accepted');
		   		currentStates[j].state.removeClass('rejected');
		   	}
		   	cur = traverse(currentStates, inputString[i]);
		   	if (cur.length === 0) {
		   		break;
		   	}
			currentStates = cur;
		   	configView = "";
		   	for (var j = 0; j < currentStates.length; j++) {
		   		if (currentStates[j].curIndex === inputString.length) {
					if (currentStates[j].state.hasClass('final')) {
						currentStates[j].state.addClass('accepted');
						stringAccepted = true;
					} else {
						currentStates[j].state.addClass('rejected');
					}
				}
		   		configView += cur[j].toString() + ' | ';
		   	}
		    jsav.umsg(configView);
		    if (stringAccepted) {
		   		break;
		   	}
		}

		if (stringAccepted) {
			//jsav.umsg("Accepted");
		} else {
			jsav.umsg("Rejected");
		}
		jsav.recorded();
	};

	var traverse = function(currentStates) {
		// currentStates is an array of configurations
		var nextStates = [];
		for (var i = 0; i < currentStates.length; i++) {
			var successors = currentStates[i].state.neighbors(),
				curStack = currentStates[i].stack,
				curIndex = currentStates[i].curIndex,
				s = currentStates[i].inputString,
				letter = s[curIndex];
			for (var next = successors.next(); next; next = successors.next()) {
				var w = g.getEdge(currentStates[i].state, next).weight().split('<br>');
				for (var j = 0; j < w.length; j++) {
					var nextIndex = curIndex + 1;
					var t = w[j].split(':');
			        if (t[0] !== letter && t[0] !== emptystring) {continue;}
			        if (t[0] === emptystring) {nextIndex = curIndex;}
			        if (t[1] !== emptystring) {
			          var l = [],
			              cur;
			          for (var k = 0; k < t[1].length; k++) {
			            cur = curStack.pop();
			            if (cur) {
			              l.push(cur);
			            } else {
			              break;
			            }
			          }
			          if (t[1] === l.join('')) {
			          	var nextConfig = new Configuration(next, curStack, s, nextIndex);
			          	if (t[2] !== emptystring){
			              for (var h = t[2].length - 1; h >= 0; h--) {
			                nextConfig.stack.push(t[2].charAt(h));
			              }
			            }
			            next.addClass('current');
						nextStates.push(nextConfig);
			          } 
			          l.reverse();
			          curStack = curStack.concat(l);
			        } else {
			          	var nextConfig = new Configuration(next, curStack, s, nextIndex);
			          	if (t[2] !== emptystring){
			              for (var h = t[2].length - 1; h >= 0; h--) {
			                nextConfig.stack.push(t[2].charAt(h));
			              }
			            }
			            next.addClass('current');
						nextStates.push(nextConfig);
			           	break;
			        }
				}
			}
		}
		nextStates = _.uniq(nextStates, function(x) {return x.toString();});
		nextStates = addLambdaClosure(nextStates);
		return nextStates;
	};

	var addLambdaClosure = function(nextStates) {
		lambdaStates = [];
		for (var i = 0; i < nextStates.length; i++) {
			var successors = nextStates[i].state.neighbors();
			for (var next = successors.next(); next; next = successors.next()) {
				var weight = g.getEdge(nextStates[i].state, next).weight().split('<br>');
				for (var j = 0; j < weight.length; j++) {
					if (!next.hasClass('current') && _.every(weight[j].split(':'), function(x) {return x === emptystring})) {
   						next.addClass('current');
   						var nextConfig = new Configuration(next, nextStates[i].stack, nextStates[i].inputString, nextStates[i].curIndex)
						lambdaStates.push(nextConfig);
   					}
				}
			}
		}
		if(lambdaStates.length > 0) {
			lambdaStates = addLambdaClosure(lambdaStates);
		}
		for (var k = 0; k < lambdaStates.length; k++) {
			nextStates.push(lambdaStates[k]);
		}
		nextStates = _.filter(nextStates, function (x) {
			if (x.stack.length > 50) {
				console.warn("large stack");
				return false;
			} return true;});
		nextStates = _.uniq(nextStates, function(x) {return x.toString();});
		return nextStates;
	};

	// Configuration object
	var Configuration = function(state, stack, str, index) {
		this.state = state;
		this.inputString = str;
		this.curIndex = index;
		this.stack = stack.slice(0);
		this.toString = function() {
			return this.state.value() + ' ' + this.inputString.substring(0, this.curIndex) + ' ' + this.stack.join();
		}
	};
	

	//======================
	$('#playbutton').click(play);
	$('#layoutbutton').click(function() {g.layout()});
	$('#testNDbutton').click(testND);
	$('#testlambdabutton').click(testLambda);
	$('#addnodesbutton').click(addNodesMode);
	$('#changeButton').click(changeEditingMode);
	$('#addedgesbutton').click(addEdgesMode);
	$('#movenodesbutton').click(moveNodesMode);
	$('#editnodesbutton').click(editNodesMode);
}(jQuery));	