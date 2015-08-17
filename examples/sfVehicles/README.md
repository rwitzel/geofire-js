### Backend features

to implement:

* create new poll
  * by clicking on the page
  * then customize poll content
  * save poll
* show existing polls on the map
    * query polls (including votes) in a certain radius of a certain position
* vote
  * select an existing poll by clicking on a poll on the map
  * add vote but avoid duplicate votes by evaluating client IP (via http://api.hostip.info/ )

### Access a firebase database

At the moment a database is used that is owned by the user rwitzel:

    https://blinding-torch-8102.firebaseio.com/

The data is always accessed anonymously:

    https://www.firebase.com/docs/web/guide/login/anonymous.html