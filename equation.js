require(["jquery"], function($) {
  $(function() {
	  $("#equate").click(function() {
	  	equate();
	  });
  });
});

function equate() {
	alert("Number of Galaxies: " + $("#numberOfGalaxies").val());
}