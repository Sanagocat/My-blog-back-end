// DB connection Pool 사용
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const SECRET_KEY = "danwooBlogKey";

// AWS 데이터베이스 URL
const connectionString = `postgres://${process.env.DATABASE_USER}:${process.env.DATABASE_PASSWORD}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/${process.env.DATABASE_NAME}`;

//Backend for REST API
const express = require("express");
const cors = require("cors");
const { title } = require("process");
const { register } = require("module");
const app = express();
const port = process.env.PORT || 8080;

// 모든 도메인에서의 요청을 허용하는 CORS 설정
app.use(cors());
app.use(express.json());

// db connection pool 을 사용하여 연결 (연결 Pool -> 할당 -> release)
const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false, // SSL 연결을 사용합니다.
    },
});

// 서버 시작
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

// Default GET 요청 처리
app.get("/", (req, res) => {
    res.send("Welcome to The Blog.");
});

// test1 api
app.get("/test1", async (req, res) => {
    res.send("Welcome to The test 1 page");
    console.log("test1 requested");
    await createBlog("Mike", "Mikes blog", "Mike wrote blog", "2024-10-12");
});

// test2 api
app.get("/test2", async (req, res) => {
    res.send("Welcome to The test 2 page");
    console.log("test2 requested");
    await createBlog("Joe", "Joes blog", "Joe wrote blog", "2024-10-15");
});

// test3
app.get("/test3", async (req, res) => {
    res.send("Welcome to The test 3 page");
    console.log("test3 requested");
    await createBlog(
        "Danwoo",
        "Danwoo blog",
        "Danwoo wrote blog",
        "2024-10-31",
    );
});

// post blog api
app.post("/postblog", async (req, res) => {
    console.log(req.body);

    const userName = req.body.name;
    const userTitle = req.body.title;
    const userContents = req.body.contents;
    const userDate = req.body.date;

    try {
        await createBlog(userName, userTitle, userContents, userDate);

        console.log("post blog success!");
        res.json({
            result: "success",
        });
    } catch (err) {
        console.error("에러 발생:", err);
        res.json({
            result: "fail",
        });
    }
});

//create blog
async function createBlog(userName, userTitle, userContents, userDate) {
    //1.커넥션 풀에서 클라이언트 가져와 연결
    const client = await pool.connect();
    console.log("PostgreSQL DB connected");

    //2. DB CONTROL Code
    try {
        const createQuery = `
        INSERT INTO danwooblog 
        (name, title, contents, date) 
        VALUES($1, $2, $3, $4);
        `;
        await client.query(createQuery, [
            userName,
            userTitle,
            userContents,
            userDate,
        ]);
    } catch (err) {
        console.error("에러 발생:", err);
    } finally {
        //3. 데이터베이스 연결 종료
        client.release();
        console.log("PostgreSQL DB released complete");
    }
}

// API : query all blog list - GET : getpostlist
// /getpostlist?limit=10&page=2
app.get("/getpostlist", async (req, res) => {
    //0.get page & limit variable
    const pageNumber = req.query.page;
    const limit = req.query.limit; // =10
    const offset = limit * (pageNumber - 1); //1 -> 0 / 2 -> 10 / 3 -> 20 / 4 -> 30 ...

    //1.커넥션 풀에서 클라이언트 가져와 연결
    const client = await pool.connect();
    console.log("getpostlist : DB connected");

    //2. DB QUERY CONTROL Code
    try {
        //DB connect and query post list!!
        const callPostListQuery = `
            SELECT id, name, title, date
            FROM danwooblog
            ORDER BY date DESC
            LIMIT ${limit} OFFSET ${offset};
        `;
        const result = await client.query(callPostListQuery);
        console.log(result);
        const postList = result.rows;
        console.log(postList);

        res.json({
            posts: postList,
        });
    } catch (err) {
        console.error("에러 발생:", err);
    } finally {
        //3. 데이터베이스 연결 종료
        client.release();
        console.log("getpostlist : DB released complete");
    }
});

// API : get detail blog contents - GET
// /getdetailblog/15
app.get("/getdetailblog/:id", async (req, res) => {
    //0. req의 id 를 얻어오기
    const blogId = req.params.id;

    //1.커넥션 풀에서 클라이언트 가져와 연결
    const client = await pool.connect();
    console.log("getdetailblog : DB connected");

    //2. DB QUERY CONTROL Code
    try {
        const getDetailQuery = `
        SELECT id, name, title, contents, date
        FROM danwooblog
        WHERE id = $1;
        `;
        const result = await client.query(getDetailQuery, [blogId]);
        console.log(result);
        const detailPost = result.rows[0];
        console.log(detailPost);
        res.json({
            data: detailPost,
        });
    } catch (err) {
        console.error("에러 발생:", err);
    } finally {
        //3. 데이터베이스 연결 종료
        client.release();
        console.log("getdetailblog : DB released complete");
    }
});

//make UPDATE backend function!!
//END POINT : updateblog, id=X
//create : app.post - send data in body
//read : app.get - send /:id
//update : app.put - send data in body
//delete : app.delete - send /:id
app.put("/updateblog", async (req, res) => {
    const userName = req.body.name;
    const userTitle = req.body.title;
    const userContents = req.body.contents;
    const userDate = req.body.date;
    const blogId = req.body.id;

    //1.커넥션 풀에서 클라이언트 가져와 DB 연결
    const client = await pool.connect();
    console.log("PostgreSQL DB connected");

    //2. DB CONTROL Code
    try {
        const updateQuery = `
        UPDATE danwooblog 
        SET name = $1, title = $2, contents = $3, date = $4
        WHERE id = $5;
        `;
        const dbResult = await client.query(updateQuery, [
            userName,
            userTitle,
            userContents,
            userDate,
            blogId,
        ]);
        console.log(dbResult);
        res.json({
            result: dbResult,
        });
    } catch (err) {
        console.error("에러 발생:", err);
    } finally {
        //3. 데이터베이스 연결 종료
        client.release();
        console.log("PostgreSQL DB released complete");
    }
});

//make DELETE backend function!
//END POINT : deleteblog, id=X
//create : app.post - send data in body
//read : app.get - send /:id
//update : app.put - send data in body
//delete : app.delete - send /:id
app.delete("/deleteblog/:id", async (req, res) => {
    console.log("DELETE !!!!!!!!!!!!!!");

    //0. req의 id 를 얻어오기
    const blogId = req.params.id;
    console.log("삭제할 blogId:", blogId);

    //1.커넥션 풀에서 클라이언트 가져와 연결
    const client = await pool.connect();
    console.log("getdetailblog : DB connected");

    //2. DB QUERY CONTROL Code
    try {
        const deleteQuery = `
        DELETE FROM danwooblog
        WHERE id =$1;
        `;
        const dbResult = await client.query(deleteQuery, [blogId]);
        console.log(dbResult);
        res.json({
            result: dbResult,
        });
    } catch (err) {
        console.error("에러 발생:", err);
    } finally {
        //3. 데이터베이스 연결 종료
        client.release();
        console.log("getdetailblog : DB released complete");
    }
});

// login api end point
// 보안상 위험한 로그인 코드 (테스트용)
app.post("/login", async (req, res) => {
    //1.커넥션 풀에서 클라이언트 가져와 연결
    const client = await pool.connect();
    console.log("PostgreSQL DB connected");

    const userID = req.body.userId;
    const userPassword = req.body.password;

    //2. DB CONTROL Code
    try {
        const logInQuery = `
           SELECT * FROM userdata WHERE userid = $1 
        `;
        const result = await client.query(logInQuery, [userID]);

        //1. check if userid is in user database = result.rows.length
        if (result.rows.length == 0) {
            //cannot find id => (result.rows.length==0)
            res.json({
                result: "fail",
                message: "UNKNOWN ID!!",
                username: "",
            });
        } //check password
        else {
            const dbPassword = result.rows[0].password;
            const bCompareResult = await bcrypt.compare(
                userPassword,
                dbPassword,
            ); //hashed password compare
            if (bCompareResult == true) {
                //sucess - > LOGIN SUCCESS!!
                //make json token
                const jwtToken = jwt.sign(
                    {
                        userid: userID,
                        username: result.rows[0].username,
                    },
                    SECRET_KEY,
                    { expiresIn: "12h" }, // 12시간 유효
                );

                //add jwtToken
                res.json({
                    result: "success",
                    message: "LOGIN SUCCESS!!",
                    username: result.rows[0].username,
                    token: jwtToken,
                });
            } //fail -> WRONG PASSWORD!!
            else {
                res.json({
                    result: "fail",
                    message: "INCORRECT PASSWORD!!",
                    username: "",
                });
            }
        }
    } catch (err) {
        console.error("에러 발생:", err);
        res.json({
            result: "fail",
            message: "DATABASE ERROR!!",
            username: "",
        });
    } finally {
        //3. 데이터베이스 연결 종료
        client.release();
        console.log("PostgreSQL DB released complete");
    }
});

// register api end point
app.post("/register", async (req, res) => {
    //1.커넥션 풀에서 클라이언트 가져와 연결
    const client = await pool.connect();
    console.log("PostgreSQL DB connected");

    const userID = req.body.userId;
    const userPassword = req.body.password;
    const userName = req.body.username;

    //2. DB CONTROL Code
    try {
        //1. check if userid is Exist!!
        const logInQuery = `
           SELECT * FROM userdata WHERE userid = $1 
        `;
        const checkUserIdExist = await client.query(logInQuery, [userID]);
        if (checkUserIdExist.rows.length > 0) {
            //UserId Exist!!
            res.json({
                result: "fail",
                message: "Already registered user Id!!",
                username: "",
            });
        } else if (userPassword.length < 4) {
            //password length <4 Fail!! Password over 4 character
            res.json({
                result: "fail",
                message: "Password must be over 4 characters!!",
                username: "",
            });
        } //UserID NOT exist
        else {
            const registerQuery = `
             INSERT INTO userdata (userid, password, username) VALUES ($1, $2, $3);
            `;

            const hashedPassword = await bcrypt.hash(userPassword, 10);
            const result = await client.query(registerQuery, [
                userID,
                hashedPassword,
                userName,
            ]);

            res.json({
                result: "success",
                message: "REGISTER SUCCESS!!",
                username: userName,
            });
        }
    } catch (err) {
        console.error("에러 발생:", err);

        res.json({
            result: "fail",
            message: "REGISTER DB FAIL!!",
            username: "",
        });
    } finally {
        //3. 데이터베이스 연결 종료
        client.release();
        console.log("PostgreSQL DB released complete");
    }
});

//jwt token verification
function verifyToken(req, res, next) {
    console.log("verifyToken()");
    const token = req.headers["authorization"]?.split(" ")[1]; // Bearer [token]

    if (token == "") {
        console.log("NO TOKEN...........");
        return res.status(403).json({ message: "No token provided" });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded; // 이후 라우트에서 req.user 사용 가능 //login 할때 넣어준 정보 decoded 됨
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}

//jwt verification endpoint
app.post("/me", verifyToken, async (req, res) => {
    console.log("VERIFICATION END POINT");
    res.json({
        userid: req.user.userid,
        username: req.user.username,
    });
});
