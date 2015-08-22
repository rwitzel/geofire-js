// Global map variable
var map;

// Set the center as Firebase HQ
var locations = {
    "FirebaseHQ": [37.785326, -122.405696],
    "Caltrain": [37.7789, -122.3917]
};
var center = locations["FirebaseHQ"];

// Query radius
var radiusInKm = 0.5;

// Get a reference to the Firebase public transit open data set
//var transitFirebaseRef = new Firebase("https://publicdata-transit.firebaseio.com/")
var transitFirebaseRef = new Firebase("https://blinding-torch-8102.firebaseio.com/")


// Create a new GeoFire instance, pulling data from the public transit data
var geoFire = new GeoFire(transitFirebaseRef.child("_geofire"));

/*************/
/*  GEOQUERY */
/*************/
// Keep track of all of the vehicles currently within the query
var vehiclesInQuery = {};

// Create a new GeoQuery instance
var geoQuery = geoFire.query({
    center: center,
    radius: radiusInKm
});

var init = false;
if (init) { transitFirebaseRef.child("polls").set([ { "anything": true } ] ); } /* init an array */

/* Adds new vehicle markers to the map when they enter the query */
geoQuery.on("key_entered", function (vehicleId, vehicleLocation) {
    // Specify that the vehicle has entered this query
    vehicleId = vehicleId.split(":")[1];
    vehiclesInQuery[vehicleId] = true;

    // Look up the vehicle's data in the Transit Open Data Set
    transitFirebaseRef.child("polls").child(vehicleId).once("value", function (dataSnapshot) {
        // Get the vehicle data from the Open Data Set
        vehicle = dataSnapshot.val();

        // If the vehicle has not already exited this query in the time it took to look up its data in the Open Data
        // Set, add it to the map
        if (vehicle !== null && vehiclesInQuery[vehicleId] === true) {
            // Add the vehicle to the list of vehicles in the query
            vehiclesInQuery[vehicleId] = vehicle;
            vehicle.vehicleId = vehicleId; /* we use in the click handler for voting */

            // Create a new marker for the vehicle
            vehicle.marker = createVehicleMarker(vehicle);
        }
    });
});

/* Moves vehicles markers on the map when their location within the query changes */
geoQuery.on("key_moved", function (vehicleId, vehicleLocation) {
    // Get the vehicle from the list of vehicles in the query
    vehicleId = vehicleId.split(":")[1];
    var vehicle = vehiclesInQuery[vehicleId];

    // Animate the vehicle's marker
    if (typeof vehicle !== "undefined" && typeof vehicle.marker !== "undefined") {
        vehicle.marker.animatedMoveTo(vehicleLocation);
    }
});

/* Removes vehicle markers from the map when they exit the query */
geoQuery.on("key_exited", function (vehicleId, vehicleLocation) {
    // Get the vehicle from the list of vehicles in the query
    vehicleId = vehicleId.split(":")[1];
    var vehicle = vehiclesInQuery[vehicleId];

    // If the vehicle's data has already been loaded from the Open Data Set, remove its marker from the map
    if (vehicle !== true) {
        vehicle.marker.setMap(null);
    }

    // Remove the vehicle from the list of vehicles in the query
    delete vehiclesInQuery[vehicleId];

    if (currentVehicleId === vehicleId) {
        $(".selected_poll").html("");
    }
});

/*****************/
/*  GOOGLE MAPS  */
/*****************/
/* Initializes Google Maps */
function initializeMap() {
    // Get the location as a Google Maps latitude-longitude object
    var loc = new google.maps.LatLng(center[0], center[1]);

    // Create the Google Map
    map = new google.maps.Map(document.getElementById("map-canvas"), {
        center: loc,
        zoom: 15,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    });

    // Create a draggable circle centered on the map
    var circle = new google.maps.Circle({
        strokeColor: "#6D3099",
        strokeOpacity: 0.7,
        strokeWeight: 1,
        fillColor: "#B650FF",
        fillOpacity: 0.35,
        map: map,
        center: loc,
        radius: ((radiusInKm) * 1000),
        draggable: true
    });

    //Update the query's criteria every time the circle is dragged
    var updateCriteria = _.debounce(function () {
        var latLng = circle.getCenter();
        geoQuery.updateCriteria({
            center: [latLng.lat(), latLng.lng()],
            radius: radiusInKm
        });
    }, 10);
    google.maps.event.addListener(circle, "drag", updateCriteria);

    map.addListener('click',setPositionInNewPoll );
    google.maps.event.addListener(circle, "click", setPositionInNewPoll);
}

var setPositionInNewPoll = function(evt) {
    var val = eval("x = " + $("#new_poll").val());
    val.latLng = evt.latLng;
    $("#new_poll").val(JSON.stringify(val, 0, 2));
}

var createPoll = function(evt) {
    var val = eval("x = " + $("#new_poll").val());
    val.created_at3 = new Date().getTime();

    // create poll
    var newChildRef = transitFirebaseRef.child("polls").push(); // this new, empty ref only exists locally
    var newChildKey = newChildRef.key(); // we can get its id using key()
    val.verhicleId = newChildKey;
    newChildRef.set(val);

    // create location entry
    var location = [val.latLng.G, val.latLng.K ];
    geoFire.set("demo:" + newChildKey, location ).then(function() {
        log(newChildKey + " initially set to [" + location + "]");
    });

}

$("#btn_create_poll").click(createPoll);

/**********************/
/*  HELPER FUNCTIONS  */
/**********************/
/* Adds a marker for the inputted vehicle to the map */
function createVehicleMarker(vehicle) {
    var text = vehicle.question.substring(0,6); // TODO escape string
    var marker = new google.maps.Marker({
        icon: "https://chart.googleapis.com/chart?chst=d_bubble_icon_text_small&chld=star|bbT|" + text + "|FF6450|eee",
        position: new google.maps.LatLng(vehicle.latLng.G, vehicle.latLng.K),
        optimized: true,
        map: map
    });

    google.maps.event.addListener(marker, "click", function() {

        // update the div ".selected_poll"
        vehicle.answersMustache = [];
        jQuery.each( vehicle.answers, function(key, value) {
            vehicle.answersMustache.push({text: key, votes: value});
        });
        var input = $(".selected_poll_template").html();
        var output = Mustache.render(input, vehicle);
        $(".selected_poll").html(output);

        // update the query that updates div ".selected_poll"
        // step 1: unregister query for previous poll
        if (currentVehicleCallback != null && currentVehicleId != null) {
            transitFirebaseRef.child("polls").child(currentVehicleId).off('value', currentVehicleCallback);
        }
        // step 2: register query for the current poll
        currentVehicleId = vehicle.vehicleId;
        currentVehicleCallback = createCurrentPollUpdateCallbackForQuery(currentVehicleId);
        transitFirebaseRef.child("polls").child(currentVehicleId).on('value', currentVehicleCallback);

    });
    return marker;
}

var currentVehicleId = null;
var currentVehicleCallback = null;

function vote(evt){
    var vehicleId = $(evt.target).data("vehicleid");
    var answerText = $(evt.target).text();
    var vehicle = vehiclesInQuery[vehicleId];
    var patch = {};
    patch[answerText] = vehicle.answers[answerText] + 1;
    transitFirebaseRef.child("polls").child(vehicleId).child("answers").update(patch);
}

$(".selected_poll").on("click", "button", vote);


// Feature: setup a query so that if someone votes for the data of the current poll,
// the view is updated
//
// when the current poll is replaced with another poll,
// then the query is updated / replaced

function createCurrentPollUpdateCallbackForQuery(vehicleId) {
    var queryCallback = function (dataSnapshot) {

        vehicle = dataSnapshot.val();
        // If the vehicle has not already exited this query in the time it took to look up its data in the Open Data
        // Set, add it to the map

        if (vehicle !== null && vehiclesInQuery[vehicleId]) {

            vehicle.vehicleId = vehicleId;
            vehicle.marker = vehiclesInQuery[vehicleId].marker; // copy marker
            vehiclesInQuery[vehicleId] = vehicle;

            // update the div ".selected_poll"
            vehicle.answersMustache = [];
            jQuery.each( vehicle.answers, function(key, value) {
                vehicle.answersMustache.push({text: key, votes: value});
            });
            var input = $(".selected_poll_template").html();
            var output = Mustache.render(input, vehicle);
            $(".selected_poll").html(output);
        }
    };

    return queryCallback;
}



/* Returns true if the two inputted coordinates are approximately equivalent */
function coordinatesAreEquivalent(coord1, coord2) {
    return (Math.abs(coord1 - coord2) < 0.000001);
}

/* Animates the Marker class (based on https://stackoverflow.com/a/10906464) */
google.maps.Marker.prototype.animatedMoveTo = function (newLocation) {
    var toLat = newLocation[0];
    var toLng = newLocation[1];

    var fromLat = this.getPosition().lat();
    var fromLng = this.getPosition().lng();

    if (!coordinatesAreEquivalent(fromLat, toLat) || !coordinatesAreEquivalent(fromLng, toLng)) {
        var percent = 0;
        var latDistance = toLat - fromLat;
        var lngDistance = toLng - fromLng;
        var interval = window.setInterval(function () {
            percent += 0.01;
            var curLat = fromLat + (percent * latDistance);
            var curLng = fromLng + (percent * lngDistance);
            var pos = new google.maps.LatLng(curLat, curLng);
            this.setPosition(pos);
            if (percent >= 1) {
                window.clearInterval(interval);
            }
        }.bind(this), 50);
    }
};

// delete polls that are older than a specified max age
var currentDeleteCallback = null;

window.setInterval(function() {
    if (currentDeleteCallback != null) {
        transitFirebaseRef.child("polls").off("child_added", currentDeleteCallback);
    }
    currentDeleteCallback = function(snapshot) {

        var maxAge = parseInt($(".poll_max_age").val()) * 1000;
        var createdAtUpperLimit = new Date().getTime() - maxAge;
        vehicle = snapshot.val();
        if (vehicle.created_at3 < createdAtUpperLimit) { // "child added" is apparently called when data changes as well
            var vehicleId = snapshot.key();
            transitFirebaseRef.child("polls").child(vehicleId).remove();
            transitFirebaseRef.child("_geofire").child("demo:" + vehicleId).remove();
        }
    };

    var maxAge = parseInt($(".poll_max_age").val()) * 1000;
    var createdAtUpperLimit = new Date().getTime() - maxAge;
    transitFirebaseRef.child("polls").orderByChild("created_at3").endAt(createdAtUpperLimit).on("child_added", currentDeleteCallback);
}, 1000); // called every second (in production should we choose 1h or something?)


