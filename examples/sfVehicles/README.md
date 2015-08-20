### Backend features

to implement:

* (DONE) create new poll
  * (DONE) by clicking on the page
  * (DONE) then customize poll content
  * (DONE) save poll
* (DONE) show existing polls on the map
    * query polls (including votes) in a certain radius of a certain position
* vote
  * select an existing poll by clicking on a poll on the map
  * add vote but avoid duplicate votes by evaluating client IP (via http://api.hostip.info/ )
* remove poll (needed by admin and background job)

### Access a firebase database

At the moment a database is used that is owned by the user rwitzel:

    https://blinding-torch-8102.firebaseio.com/

The data is always accessed anonymously:

    https://www.firebase.com/docs/web/guide/login/anonymous.html


# URLs

* https://www.firebase.com/blog/2014-06-23-geofire-two-point-oh.html
* https://publicdata-transit.firebaseio.com
* https://publicdata-transit.firebaseio.com/sf-muni
* https://publicdata-transit.firebaseio.com/_geofire
* https://www.firebase.com/blog/2014-04-28-best-practices-arrays-in-firebase.html - push to get unique ID