const db = require("../db");
const bcrypt = require("bcryptjs");

const isUserExisted = async (username) => {
    const checkUser = await db.query(`SELECT * FROM "Users" WHERE username='${username}'`)
    if (checkUser.rows.length !== 0) return true;
    else return false;
}

const isEmailExisted = async (email) => {
    const checkUser = await db.query(`SELECT * FROM "Users" WHERE email='${email}'`)
    if (checkUser.rows.length !== 0) return true;
    else return false;
}

const signIn = async (req, res) => {
    const { username, password } = req.body;
    const user = await db.query(`SELECT * FROM "Users" WHERE username='${username}'`)
    // console.log(username, password);


    bcrypt.compare(req.body.password, user.password, function(err, res) {
        if (err){
          // handle error
        }
        if (res){
          // Send JWT
        } else {
          // response is OutgoingMessage object that server response http request
          return response.json({success: false, message: 'passwords do not match'});
        }
      });
    res.status(200).send({ msg: 'Ok' });


}



const signUp = async (req, res) => {
    // console.log(req.body)
    try {
        const user = {
            username: req.body.username,
            password: bcrypt.hashSync(req.body.password, 8),
            email: req.body.email
        }
        if (isUserExisted(user.username)) res.status(401).send({ msg: 'Username already existed' })
        if (isEmailExisted(user.email)) res.status(401).send({ msg: 'Email already existed' })

        let strQuery = `INSERT INTO "Users" (username, password, email, role) VALUES ('${user.username}', '${user.password}', '${user.email}', 'user')`


        // const password = await bcrypt.hash(req.body.password);
        // const username = req.body.username;
        console.log(strQuery)
        await db.query(strQuery)
        res.status(200).send({ msg: 'Sign up success!' });
    } catch (err) {
        res.status(401).send({ msg: err });

        // res.redirect('localhost:30001/signup')
    }
}




module.exports = {
    signIn,
    signUp
}