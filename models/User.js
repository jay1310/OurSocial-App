const bcrypt = require("bcryptjs")
const usersCollection = require('../db').db().collection("users")
const validator = require("validator")
const md5 = require('md5')

let User = function(data, getAvatar){
    this.data = data
    this.errors = []
    if(getAvatar == undefined){getAvatar = false}
    if(getAvatar){this.getAvatar()}
}

User.prototype.cleanUp = function() {
    if(typeof(this.data.username) != "string"){this.data.username = "" }
    if(typeof(this.data.email) != "string"){this.data.email = "" }
    if(typeof(this.data.password) != "string"){this.data.password = "" }

    // get rid of any bogus properties
    this.data = {
        username: this.data.username.trim().toLowerCase(),
        email: this.data.email.trim().toLowerCase(),
        password: this.data.password
    }
}

User.prototype.validate = function(){
    return new Promise (async (resolve, reject) => {
        if(this.data.username == ""){this.errors.push("You must provide a username") }
        if(this.data.username != "" && !validator.isAlphanumeric(this.data.username)){this.errors.push("The username should contain only alphabets and numbers.")}
        if(this.data.username.length>0)
        {
            if(this.data.username.length > 20 || this.data.password.length <3){this.errors.push("Username should be from 3 - 20 characters")}
        } 
        
        if(!validator.isEmail(this.data.email)) { this.errors.push("You must enter a valid email")}
        if(this.data.password.length>0)
        {
            if(this.data.password.length > 20 || this.data.password.length <8){this.errors.push("Password length should be from 8 - 20 characters")}
        } 
        if(this.data.password == ""){this.errors.push("You must provide a password")}
    
        // Only if username is valid then check if it is already present in the database
        if(this.data.username.length >=3 && this.data.username.length <=20 && validator.isAlphanumeric(this.data.username)) {
            let usernameExists = await usersCollection.findOne({username: this.data.username})
            if(usernameExists) { this.errors.push("That username is already taken") }
        }
     // Only if the email is valid then check if it's already taken
     if(validator.isEmail(this.data.email)) {
        let emailExists = await usersCollection.findOne({email: this.data.email})
        if(emailExists) { this.errors.push("That email is already being used") }
    }
      resolve()
    })
}

User.prototype.login = function(){
 return new Promise((resolve ,reject )=> {
    this.cleanUp()
    usersCollection.findOne( {username: this.data.username}).then((regUser)=>{
        if(regUser && bcrypt.compareSync(this.data.password, regUser.password)){
            this.data = regUser
            this.getAvatar()
            resolve("Congrats")
        }else{
            reject("Invalid username / password")
        }
    }).catch(function(){
        reject("PLease try again later!")
    })

 })

}

User.prototype.register = function(){
    return new Promise(async (resolve, reject) => {
        // Validate user data
            this.cleanUp()
            await this.validate()
        //if valid then save the user data into a database
            if(! this.errors.length){
                let salt = bcrypt.genSaltSync(10)
                this.data.password = bcrypt.hashSync(this.data.password , salt)
                await usersCollection.insertOne(this.data)
                this.getAvatar()
                resolve()
            }
            else{
                reject(this.errors)
            }
        })
}

User.prototype.getAvatar = function(){
    this.avatar = `https://gravatar.com/avatar/${md5(this.data.email)}?s=128`
}

User.findByUsername = function(username){
    return new Promise(function(resolve, reject){
        if(typeof(username) != "string"){
            reject()
            return
        }
        usersCollection.findOne({username: username}).then(function(userDoc){
            if(userDoc){
                userDoc = new User(userDoc, true)
                userDoc = {
                    _id: userDoc.data._id,
                    username: userDoc.data.username,
                    avatar: userDoc.avatar
                }
                resolve(userDoc)
            }else{
                reject()
            }
        }).catch(function(){
            reject()
        })
    })
}

User.doesEmailExist = function(email) {
    return new Promise(async function(resolve, reject) {
        if(typeof(email) != "string") {
            resolve(false)
            return
        }
        let user = await usersCollection.findOne({email: email})
        if(user){
            resolve(true)
        }else {
            resolve(false)
        }
    })
}

module.exports = User