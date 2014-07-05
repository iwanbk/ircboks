package main

import (
	"code.google.com/p/go.crypto/bcrypt"
	"code.google.com/p/go.net/websocket"
	log "github.com/ngmoco/timber"
)

//AuthInfo represent authentication info sent by user when logging in
type AuthInfo struct {
	UserID   string `bson:"userId" json:"userId"`
	Password string `bson:"password" json:"password"`
}

//User represent a user in ircboks
type User struct {
	Id       int64
	UserId   string
	Password string
}

//UserLogin handle login message from endpoint.
//It check user passwod and return following infos:
//	- resp
//	- login result
// - err
func UserLogin(e *EndptMsg, ws *websocket.Conn) (string, bool, error) {
	userID := e.UserID
	password, ok := e.GetDataString("password")
	if !ok {
		log.Info("[UserLogin]null password.userID = " + userID)
		return "", false, nil
	}
	//do login
	result, err := checkAuth(userID, password)

	if err != nil {
		return authFalseGenStr("error"), true, nil
	}

	if result == false {
		return authFalseGenStr("loginFailed"), true, nil
	}

	//check IRC client existence
	ctx, found := ContextMap.Get(userID)
	if !found {
		return authTrueGenStr(false, "", "", ""), true, nil
	}

	//update client context
	ctx.AddWs(ws)
	return authTrueGenStr(true, ctx.Nick, ctx.Server, ctx.User), true, nil
}

//UserLogout will log out the user
func UserLogout(userID string, ws *websocket.Conn) {
	ctx, found := ContextMap.Get(userID)
	if !found {
		log.Error("[UserLogout]can't find = " + userID)
		return
	}
	ctx.DelWs(ws)
}

//Check auth
//return userId and auth result
func checkAuth(userID, password string) (bool, error) {
	//get user from db
	var user User
	if err := DB.Where("user_id = ?", userID).First(&user).Error; err != nil {
		log.Info("[checkAuth] user " + userID + " not found")
		return false, err
	}

	//check password
	return authComparePassword(user.Password, password), nil
}

func authFalseGenStr(reason string) string {
	return jsonMarshal("loginResult", map[string]interface{}{"result": false})
}

//AuthTrueGenStr generate json response when authentication succeed
func authTrueGenStr(clientExist bool, nick, server, user string) string {
	data := make(map[string]interface{})
	data["result"] = true
	data["ircClientExist"] = clientExist
	if clientExist {
		data["nick"] = nick
		data["server"] = server
		data["user"] = user
	}
	return jsonMarshal("loginResult", data)
}

//check if user already exist
func isUserExist(userID string) bool {
	var user User
	if err := DB.Where("user_id = ?", userID).First(&user).Error; err != nil {
		return false
	}
	return true
}

//UserRegister handle user registration
func UserRegister(e *EndptMsg, ws *websocket.Conn) {
	userID := e.UserID
	password, ok := e.GetDataString("password")
	if !ok {
		websocket.Message.Send(ws, `{"event":"registrationResult", "data" : {"result":"failed", "reason":null password"}}`)
		return
	}

	//check if user already exist
	if isUserExist(userID) {
		log.Info("[registerUser]User '" + userID + "' already registered")
		websocket.Message.Send(ws, `{"event":"registrationResult", "data" : {"result":"failed", "reason":"email address already registered"}}`)
		return
	}

	log.Info("[registerUser] registering " + userID)

	hashedPass, err := authHassPassword(password)
	if err != nil {
		log.Error("[RegisterUser]:failed to hass password : " + err.Error())
		websocket.Message.Send(ws, `{"event":"registrationResult", "data" : {"result":"failed", "reason":"internal error"}}`)
		return
	}

	if len(hashedPass) == 0 {
		log.Error("[RegisterUser]:failed to hass password : password len = 0")
		websocket.Message.Send(ws, `{"event":"registrationResult", "data" : {"result":"failed", "reason":"invalid password"}}`)
		return
	}

	user := User{
		UserId:   userID,
		Password: hashedPass,
	}
	if err = DB.Save(&user).Error; err != nil {
		log.Error("Can't insert new user:" + err.Error())
		websocket.Message.Send(ws, `{"event":"registrationResult", "data" : {"result":"failed", "reason":"internal DB error"}}`)
		return
	}
	websocket.Message.Send(ws, `{"event":"registrationResult", "data" : {"result":"ok"}}`)
}

//hash user password
func authHassPassword(password string) (string, error) {
	bytePass, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", nil
	}
	return string(bytePass), nil
}

func authComparePassword(hashedPass, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPass), []byte(password))
	return err == nil
}
