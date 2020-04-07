$(document).ready(function() {
    var monthNames = [ lang.January, lang.February, lang.March, lang.April, lang.May, lang.June, lang.July, lang.August, lang.September, lang.October, lang.November, lang.December ];
    var dayNames= [lang.Sunday, lang.Monday, lang.Tuesday, lang.Wednesday, lang.Thursday, lang.Friday, lang.Saturday]
    var timeMin = document.getElementById("time-min")
    var timeSec = document.getElementById("time-sec")
    var timeHour = document.getElementById("time-hours")
    var timeDate = document.getElementById("time-date")
    var newDate = new Date();
    newDate.setDate(newDate.getDate());
    var updateDate = function(){
        timeDate.innerHTML = dayNames[newDate.getDay()] + " " + newDate.getDate() + ' ' + monthNames[newDate.getMonth()] + ' ' + newDate.getFullYear();
    }
    var second = function(theDate) {
	   var seconds = theDate.getSeconds();
	   timeSec.innerHTML=( seconds < 10 ? "0" : "" ) + seconds;
	}
    var minute = function(theDate) {
    	var minutes = theDate.getMinutes();
        timeMin.innerHTML=(( minutes < 10 ? "0" : "" ) + minutes);
    }
    var hour = function(theDate) {
        var hours = theDate.getHours();
        hours = ( hours < 10 ? "0" : "" ) + hours;
        if(timeHour.classList.contains('twentyfour') && hours > 12)hours = hours - 12;
        timeHour.innerHTML = hours
    }
    var setAll = function(){
        var theDate = new Date()
        second(theDate)
        if(currentMinute !== theDate.getMinutes())minute(theDate)
        if(currentHour !== theDate.getHours())hour(theDate)
        if(currentDay !== theDate.getDay())updateDate()
    }
    setAll()
    var currentHour = newDate.getHours()
    var currentMinute = newDate.getMinutes()
    var currentDay = newDate.getDay()
    setInterval(function(){
        setAll()
    },1000);
    setInterval(function(){
        updateDate()
    },1000 * 60 * 60);
    updateDate()
    document.getElementById("clock").onclick = function(){
        timeHour.classList.toggle('twentyfour')
        currentHour = null
        setAll()
        currentHour = newDate.getHours()
        updateDate()
    }
});
