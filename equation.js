require(["jquery"], function($) {
  $(function() {
	  $(".constituent").change(function() {
	  	equate();
	  });
  });
});

function equate() {
	$("#planetsInGalaxy").text(
		($("#numberOfStars").val() * 1000000000)
			* $("#ratioOfSolarSystemsWithPlanets").val()
			* $("#ratioOfThirdGenerationStarSystems").val());
}