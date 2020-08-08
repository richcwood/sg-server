Update / PUT rules

Fields that are missing shouldn't be touched - leave the existing values.
Fields that are set to null explicity should be cleared / nulled out.


Examples:

Current object: {"id": 1, "firstName": "Bart", "lastName": "Wood"};
PUT object: {"id": 1, "lastName": "Woodrow", "smell": "pretty good"};
Resulting object: {"id": 1, "firstName": "Bart", "lastName": "Woodrow", "smell": "pretty good"};

