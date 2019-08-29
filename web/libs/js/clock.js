$(document).ready(function() {
    var monthNames = [ lang.January, lang.February, lang.March, lang.April, lang.May, lang.June, lang.July, lang.August, lang.September, lang.October, lang.November, lang.December ]; 
    var dayNames= [lang.Sunday, lang.Monday, lang.Tuesday, lang.Wednesday, lang.Thursday, lang.Friday, lang.Saturday]

    var newDate = new Date();
    newDate.setDate(newDate.getDate());
    $('#time-date').html(dayNames[newDate.getDay()] + " " + newDate.getDate() + ' ' + monthNames[newDate.getMonth()] + ' ' + newDate.getFullYear());

    var second=function() {
	   var seconds = new Date().getSeconds();
	   document.getElementById("time-sec").innerHTML=( seconds < 10 ? "0" : "" ) + seconds;
	}
    var minute=function() {
    	var minutes = new Date().getMinutes();
        document.getElementById("time-min").innerHTML=(( minutes < 10 ? "0" : "" ) + minutes);
    }
    var hour=function() {
        var hours = new Date().getHours();
        var element=$("#time-hours");
        hours = ( hours < 10 ? "0" : "" ) + hours;
        if(element.hasClass('twentyfour')&&hours>12){hours=hours-12}
        element.html(hours);
    }
    setInterval(function(){second(),minute(),hour();},1000);
    second(),minute(),hour();
}); 