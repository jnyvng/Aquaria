//Authors: Christian Stolte, Vivian Ho, Julian Heinrich

///////// sidebar information panels ////////////

function updatePDBPanel(PDBData, commonName, score) {
	if(PDBData) {
		var molecule_name, pdbid, chain, acc;
		console.log("Updating PDB info");
		console.log(PDBData);
		pdbid = PDBData.pdb_id;
		chain = PDBData.pdb_chain;
		acc = PDBData.Accession;
		//author's names
		var auth, journal, ypub;
		if (PDBData.authors) {
			if ( PDBData.authors.indexOf(",") == -1){ auth = PDBData.authors; }	//single author
			else {
				var authorlist = PDBData.authors.split(", "); //console.log(authorlist.toString());
				for (n in authorlist) { //strip off initials
					var patrn = /[A-Z]+(?=\(\d\)|\.|$)/;
					var initial = authorlist[n].match(patrn); //console.log(authorlist[n]+", initial: "+initial);
					var authName = authorlist[n].substring(0, authorlist[n].indexOf(" "+initial));  
					authorlist[n] = authName; //console.log("authName["+n+"]: "+authName);
				}  
				//console.log(authorlist.toString());

				if (authorlist.length == 1) { auth = authorlist[0]; }
				if (authorlist.length == 2) { auth = authorlist[0] + " & "+ authorlist[1]; }
				else {
					auth = authorlist[0] + " et al.";
				}
			}	
		}	   
		if (PDBData.citation) {

			journal = PDBData.citation.match(/^.*?\s\d{4}/).toString(); //console.log("Journal: "+journal);
			ypub = journal.substring(journal.length-4); //console.log("Year: "+ypub);
			var jourNm = journal.substring(0, journal.indexOf(ypub));
			//strip out periods
			jourNm = jourNm.replace("."," ");
		}
		
		if( PDBData.Molecule != null ){ molecule_name = PDBData.Molecule; console.log("molecule: "+molecule_name); }
		//strip out stuff in parentheses
		if (typeof(molecule_name) !== "undefined" ) { 
			if(molecule_name.indexOf("(") != -1) {	   
				molecule_name = molecule_name.substring(0, molecule_name.indexOf("("));   
			}
		}
		var method = PDBData.Experimental_Method;
		if(PDBData.Resolution != null)	{ method += " at "+ PDBData.Resolution + " &Aring; resolution"; } else { console.log("no resolution specified"); }
		//Assemble the "About PDB [...]" description
		if (PDBData.title) {
			$("#description #reference_title").text(PDBData.title);
			$("#description #reference_title").show();
		}
		else {
			$("#description #reference_title").hide();

		}
		$("#description #reference_link").show();
		if (jourNm && auth) {
			$("#description #reference_link a").text(auth + ", "+ jourNm + " ("+ypub+")");
		}
		else if (auth){
			$("#description #reference_link a").text(auth);
		}
		else {
			$("#description #reference_link").hide();
		}
		$("#description #reference_link a").attr("href", "http://www.ncbi.nlm.nih.gov/pubmed/"+PDBData.PubMed_ID);
		$("#description #reference_link a").attr("target", "_blank");
		$("#description #reference_link a").attr("title", "Go to PubMed");
		$("#description p.reference_abstract").remove();
		if (PDBData.abstract ) {
			$("#description #reference_link").after('<p class="reference_abstract"><strong>Abstract: </strong>'+PDBData.abstract+'</p>');
		}
		//$("#description p.reference_abstract").html(");
		if (method) {
			$("#description #method span.text").html(method);	
			$("#description #method").show();	
		}
		else {
			$("#description #method").hide();	
		}
		
		updatePDBChain(pdbid, chain, score, PDBData.Organism[PDBData.Accession]);
		
		//$("#description p.reference_abstract").trigger("updateEvent");
		$("p.reference_abstract").expander({ 
			slicePoint: 600,
			expandText: '[+]',
			userCollapseText: '[&ndash;]', 
			// onSlice: function() { console.log("Sliced "+this); },
			afterExpand: function() { //console.log("afterExpand: aligning "+$(this));
				$(this).children(".details").attr("style","display: inline;");
			}

		});	
		
		//update ABOUT PDB title
		$("#description h3 span.explanation").html("<a href='http://www.rcsb.org/pdb/explore.do?structureId="+ pdbid +"' title='Go to PDB'>PDB "+pdbid+"</a>");

		$("#aboutPDBHider").show();
		AQUARIA.blankPanel("#aboutPDB", false);
	}
	else { console.log("PDBData not available"); }
}

function updatePDBChain(pdbId, chainId, score, organism) {

	function updateText(chain, molecule_name, accession) {
		if (typeof accession !== undefined && accession !== null) {
			$("#molecule").html('<strong>Chain ' + chain + ':</strong> <span class="text"><a href="/'+ accession + '">'+ molecule_name +'</a></span>');
		} else {
			$("#molecule").html('<strong>Chain ' + chain + ':</strong> <span class="text">' + molecule_name + '</span>');
		}
		
		AQUARIA.molecule_name = molecule_name;
		AQUARIA.update3DTitle(accession, pdbId, chain, molecule_name, AQUARIA.currentMember.alignment_identity_score);
		AQUARIA.updateDocumentTitle(AQUARIA.preferred_protein_name, score, pdbId, chainId);
	};

	AQUARIA.remote.getChainInfo(pdbId, chainId, function(data) {
		if (data.length > 0) {
			var chain = data[0];
			if (chain.Type === 'Protein') {
				if (chain.Source_DB === 'UniProt') {
					AQUARIA.remote.getProteinSynonyms(chain.Accession, null, function(protNames) {
						var molecule_name = chain.Name;
						if(molecule_name.indexOf("(") != -1) {	   
							molecule_name = molecule_name.substring(0, molecule_name.indexOf("("));   
						}
						var finalText = protNames.Synonym + ' (' + molecule_name.trim() + ')';
						if (protNames.Synonym === 'none') {
							finalText = molecule_name.trim();
						}
						updateText(chainId, finalText, chain.Accession);
					}, null);
				} else {
					updateText(chainId, chain.Name);
				}
			} else if (chain.Type === 'DNA' || chain.Type === 'RNA') {
				updateText(chainId, chain.Name);
			}
		}
	});
	
	if (organism) {
		$("#description #organism span.text").text(organism);
	}

}

function updateUniprotInfo(sequence) {

	if (sequence === null ) {
		$("#about h3 span.explanation").text("Unknown");
		$("p#psyns").html("Unknown");
		$("#uniProtDesc").html('');
		$("p#osyns").html('');
		$("#morelink").remove();

		// early exit
		return;
	}

	/*
	console.log("Updating Uniprot info from "+ AQUARIA.protein_primary_accession +" to "+sequence.primary_accession);
	if(AQUARIA.protein_primary_accession === sequence.primary_accession) { 
		console.log("no update necessary");
		return;
	}
	 */

	AQUARIA.protein_primary_accession = sequence.primary_accession;

	fetchSynonyms(sequence.primary_accession);

	var info = sequence.description;

	var tightSections = [], sections = [];
	var patt = /\n[A-Z ]+:.*?$/;

	function extractLines() {
		if (info && info.length > 0) {

			var match = info.match(patt);
			if (match !== null) {
				sections.unshift(match[0].split(": "));
				info = info.replace(match[0],"");
				extractLines();
			} else {
				sections.unshift(info.split(": "));
			}	
		}
	}

	extractLines();	
	for (k in sections) {
		//format URLs
		if (sections[k][1].indexOf("URL=")!= -1) { ////console.log("URL found in section["+k+"]");
			var linkCode='',lhref='', lname='', ltitle='';
			var parts = sections[k][1].split(";");
			for (n in parts) { // parts is max. 3 strings (Name, URL, Note)
				parts[n] = parts[n].split("="); ////console.log("parts["+n+"]: "+ parts[n].toString());
				if (parts[n][0].indexOf("URL") != -1) { lhref = parts[n][1]; }
				if (parts[n][0].indexOf("Name") != -1) { lname = parts[n][1]; }
				if (parts[n][0].indexOf("Note") != -1) { ltitle = parts[n][1]; }	
			}
			linkCode = '<a href='+lhref+' title="'+ltitle+'" target="_blank">'+lname+'</a>'; ////console.log("linkCode: "+linkCode);
			sections[k][1] = linkCode;
		}
	}

	function makeLists(fromCollection) {		//convert items with the same header to bullet lists:
		var list = null;
		for (var n = 0; n < fromCollection.length; n++) {
			if(n < fromCollection.length-2) {
				var head = fromCollection[n][0];
				var nextHead = fromCollection[(n+1)][0];		
				//if the next header matches the current header, start a bullet list
				if(nextHead == head) {
					if(list === null) { list = "<ul>";}
					list += "<li>"+fromCollection[n][1]+"</li>";
				} 
				else {
					if(list === null) { //no open list
						//since the next header is different, add the current item to the new array
						tightSections.push(fromCollection[n]);
					}	
					else{	//make a list item, close the list, and add it to the new array
						list += "<li>"+fromCollection[n][1]+"</li></ul>";
						var newList = [head,list];
						tightSections.push(newList);
						list = null;
					}
				}
			}
			else { //n has reached the end of the sections array
				if(list === null) { // no open list
					tightSections.push(fromCollection[n]); 
				}
				else {
					list += "<li>"+fromCollection[n][1]+"</li></ul>";
					var newList = [head,list];
					tightSections.push(newList);
					list = null;
				}
			}	
		} ////console.log(tightSections.toString());
	}

	makeLists(sections);	

	//clear out old contents
	d3.selectAll("div#about p").remove();

	//insert new text		
	var div = d3.select("div#uniProtDesc");
	var p = div.selectAll("p")
	.data(tightSections)
	.enter().append("p")
	.attr("class", function(d,i) { return i>5 ? "hidden" : "expandable"; });
	p.append("strong")
	.text( function (d) { return d[0]+": "; });
	p.append("span")
	.attr("class", "details")
	.html( function (d) { return d[1]; });


	$("p.expandable .details, p.hidden .details").expander({
		slicePoint: 70,
		expandText: '[+]',
		userCollapseText: '[&ndash;]', 
		afterExpand: function() { //console.log("afterExpand: aligning "+$(this));
			$(this).children(".details").attr("style","display: inline;");
		}
	});	

	var hiddenPs = $("p.hidden").length;
	if (hiddenPs > 0) {		
		$("div#uniProtDesc").after('<p id="morelink"><a href="javascript:showAll();">more details ('+hiddenPs+')</a></p>');	
	}

	AQUARIA.blankPanel("#uniProtDesc", false);
}

function fetchSynonyms(proteinId) {
	//var orgId = localStorage.organism_id; 
	console.log("fetchSynonyms: "+proteinId);
	//if (orgId == "") { orgId = null; }
	AQUARIA.remote.getProteinSynonyms(proteinId, null, displayProtSynonyms, displayOrgSynonyms);

	//need orgId
	//AQUARIA.remote.getOrganismInfo(orgId, displayOrgSynonyms); 
	//console.log("osyns: " + osyns);
}

var displayOrgSynonyms = function(orgNames) {
	console.log("displayOrgSynonyms: " + orgNames.synonyms[0]);
	var onames = "<a href='http://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id="+orgNames.synonyms[0]+"' title='Go to NCBI' target='_blank' >" + orgNames.synonyms[1] + "</a>";
	for (var n=2; n < orgNames.synonyms.length; n++) { //omit first name (numeric ID)
		onames += ", " + orgNames.synonyms[n];
	}	

	//add para with link after form fields
	$("div#osyns").empty()
		.append("<p>" + onames + "</p>");
	
	$("div#osyns p").expander({
		slicePoint: 70,
		expandText: '[+]',
		userCollapseText: '[&ndash;]', 
		afterExpand: function() {
			$(this).children(".details").attr("style","display: inline;");
		}
	});	
	
	//link to organism in PDB panel - doesn't work as intended: there are sometimes multiple organisms!
	//$("p#organism span.text").wrap("<a href='http://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id="+orgNames.synonyms[0]+"' title='Go to NCBI' target='_blank' ></a>");
};

var displayProtSynonyms = function(data) {
	//console.log(data);
	var pnames = "<b>Synonyms:</b>&nbsp;";
	var gnames = "<b>Genes:</b>&nbsp;";
	if (data.synonyms == "none") { 
		AQUARIA.preferred_protein_name = "unknown"; 
		pnames = " ";
		gnames = " ";
	} else {
		
		if (AQUARIA.preferred_protein_name === "unknown") {
			AQUARIA.preferred_protein_name = data.Synonym;
		}
		

		var gns = data.genes;
		var syns = data.synonyms;
				
		if (syns.length) {
			var first = AQUARIA.preferred_protein_name;
			if (gns && gns.length && first === gns[0]) {
				first = syns[0];
			}
			pnames += "<a href='http://www.uniprot.org/uniprot/" + AQUARIA.protein_primary_accession + "' title='Go to UniProt'>" + first + "</a>";
			for (var n = 0; n < syns.length; ++n) {
				if (syns[n] !== AQUARIA.preferred_protein_name) {
					pnames += ", " + syns[n];
				}
			}
		}
		
		if (gns && gns.length) {
			if (gns.length > 1) {
				gnames = "<b>Genes:</b>&nbsp;";
			} else {
				gnames = "<b>Gene:</b>&nbsp;";
			}
			gnames += "<a href='http://www.uniprot.org/uniprot/" + AQUARIA.protein_primary_accession+"' title='Go to UniProt'>" + gns[0] + "</a>";
			for (var i = 1; i < gns.length; i++) {
				gnames += ", " + gns[i];
			}
			gnames += "<br>";

		}

		
		$("div#psyns").empty()
					.append("<p>" + pnames + "</p>");
		
		$("div#psyns p").expander({
			slicePoint: 70,
			expandText: '[+]',
			userCollapseText: '[&ndash;]', 
			afterExpand: function() { //console.log("afterExpand: aligning "+$(this));
				$(this).children(".details").attr("style","display: inline;");
			}
		});	
		
		//add para after form fields
		$("div#gsyns").show()
					.empty()
					.append("<p>" + gnames + "</p>");
		
		$("div#gsyns p").expander({
			slicePoint: 70,
			expandText: '[+]',
			userCollapseText: '[&ndash;]', 
			afterExpand: function() { //console.log("afterExpand: aligning "+$(this));
				$(this).children(".details").attr("style","display: inline;");
			}
		});	
		
		//update ABOUT title
		$("#about h3 span.explanation").html("<a href='http://www.uniprot.org/uniprot/" + AQUARIA.protein_primary_accession + "' title='Go to UniProt'>" + AQUARIA.preferred_protein_name + "</a>");
	}

	
	
	
	
	// clear form field if not empty
	if ($("#protein_syn_input")[0].value != "") { $("#protein_syn_input")[0].value = ""; }

};

function showAll() {
	$("p.hidden").css("display","block");
	$("#morelink").hide();
	$("div#uniProtDesc").after('<p id="fewerlink"><a href="javascript:hideAll();">fewer details</a></p>');
}

function hideAll() {
	$("p.hidden").hide();
	$("#fewerlink").remove();
	$("#morelink").show();
}

$(document).on("updateEvent","p.reference_abstract", function(){
	$(this).expander({ 
		slicePoint: 200,
		expandText: '[+]',
		userCollapseText: '[&ndash;]', 
		//onSlice: function() { console.log("Sliced "+this); },
		afterExpand: function() { //console.log("afterExpand: aligning "+$(this));
			$(this).children(".details").attr("style","display: inline;");
		}

	});	
});			
