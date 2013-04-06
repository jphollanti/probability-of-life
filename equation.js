require(["jquery"], function($) {
  $(function() {
	  $(".constituent").change(function() {
	  	if (verify(this)) {
	  		equate();
	  	}
	  });
  });
});

function verify(element) {
	// http://stackoverflow.com/questions/1318076/jquery-hasattr-checking-to-see-if-there-is-an-attribute-on-an-element
	var range = $(element).attr("data-range");
	if (typeof range === 'undefined' && range === false) {
    return true;
	}

	var ranges = range.split("-");
	var low = parseInt(ranges[0]);
	var high = parseInt(ranges[1]);
	var value = parseInt($(element).val());
	if (value < low || value > high) {
		$(element).css("background-color", "#f00");
		return false;
	}
	$(element).css("background-color", "#fff");
	return true;
}

function equate() {
  /**
   */
	$("#planetsInGalaxy").text(
			($("#numberOfStars").val() * 1000000000)
		* $("#averageNumberOfPlanetsInASolarSystem").val()
		* toRatio($("#ratioOfSolarSystemsWithPlanets").val())
		* toRatio($("#ratioOfThirdGenerationStarSystems").val())
		);
	
	/**
	 */
	$("#planetsCapableOfSupportingLife").text(
			$("#planetsInGalaxy").text()
		* toRatio($("#ratioOfPlanetsInHabitableZone").val())
		* toRatio($("#ratioOfPlanetsWithWater").val())
		* toRatio($("#ratioOfSystemsWithGuardianPlanet").val())
		* toRatio($("#ratioOfPlanetsWithAnIronCore").val())
		* toRatio($("#ratioOfPlanetsWithSufficientMass").val())
		* toRatio($("#ratioOfPlanetsWithChemicalPrerequisitesForSupportingLife").val())
		);
	
	/**
	 */
	var thirdGenStart = $("#ageOf3rdGenerationStarSystems").val();
	var timeWindowStart = 
					$("#ageOf3rdGenerationStarSystems").val()
				- $("#timeForLifeToAppearAfterPlanetIsBorn").val();
	var timeWindowEnd = $("#timeForLifeToAppearAfterPlanetIsBorn").val();
	
	var timeToIntelligentLife = $("#timeAfterPrimitiveLifeEvolvesIntoIntelligentLife").val();
	var timeToSivilization = $("#timeForIntelligentLifeToEvolveIntoASivilization").val();
	
	var planetsCapableOfSupportingLife = $("#planetsCapableOfSupportingLife").text();
	
	$("#timeWindowForLife").text(
		timeWindowStart
		+ " - " +
		timeWindowEnd		
		);
	
	$("#amountOfLife").text(
			((timeWindowStart - timeWindowEnd) / thirdGenStart)
		* planetsCapableOfSupportingLife
		);
	
	$("#amountOfIntelligentLife").text(
			((timeWindowStart - timeWindowEnd - timeToIntelligentLife) / thirdGenStart)
		* planetsCapableOfSupportingLife
		);
	
	
	$("#avgAmountOfSivilizations").text(
			(
				(timeWindowStart - timeWindowEnd - timeToIntelligentLife - timeToSivilization) 
				/ thirdGenStart
			)
		* planetsCapableOfSupportingLife
		);
	
	
	$("#timeInYearsWhenSivilizationsHaveEvolved").text(
		(thirdGenStart - timeWindowEnd - timeWindowEnd - timeToIntelligentLife - timeToSivilization) * 1000000000
		);
	
	$("#newCivilizationEvolvesEvery").text(
		$("#timeInYearsWhenSivilizationsHaveEvolved").text() / $("#avgAmountOfSivilizations").text()
		);
	
	$("#amountOfSivilizationsInTheGalaxy").text(
		$("#howLongDoSivilizationsSurvive").val() / $("#newCivilizationEvolvesEvery").text()
		);
}

function toRatio(percentage) {
	return percentage / 100;
}