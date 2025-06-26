
function placeThumbnails(){

if(parseInt($("#rightContainer").css("height")) < $(window).height() - 90){
$("#rightContainer").css("height", $(window).height() - 84);
$("#leftMenuContainer").css("height", $(window).height() - 84);
}
$("#leftMenuContainer").css("height", $("#rightContainer").css("height"));
}

placeThumbnails();	

$( window ).resize(function(){
placeThumbnails();	
})

$(".dropDownBtn").click(function(event){
event.stopPropagation()
$(this).parent().find("#filterList").toggle();	
})

