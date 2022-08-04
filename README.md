docker build . -t name

PORT and FB Oauth app id can be changed in .env  
//todo remove .env and change fb app id  

(GET)  
/login  
returns link for FB OAuth, access_token is in URL  

(GET, POST, PUT, DELETE)  
/article/:path  

Every image in gallery can have only 1 article(text/description).  
path variable is the same as for image in /gallery/:path  
It is accessed through image path(NOT article path)  

GET - get article  
POST - post article  
PUT - update article  
DELETE - delete article  
