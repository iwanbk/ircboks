package main

import (
	"code.google.com/p/go.crypto/bcrypt"
	"code.google.com/p/go.net/websocket"
	"encoding/json"
	log "github.com/ngmoco/timber"
	"labix.org/v2/mgo"
	"labix.org/v2/mgo/bson"
)

//User represent a user in ircboks
type User struct {
	Id       bson.ObjectId `bson:"_id"`
	UserId   string        `bson:"userId"`
	Password string        `bson:"password"`
}

//AuthInfo represent authentication info sent by user when logging in
type AuthInfo struct {
	Id       bson.ObjectId `bson:"_id"`
	UserId   string        `bson:"userId" json:"userId"`
	Password string        `bson:"password" json:"password"`
}

//AuthMsg is an authentication message from endpoint
type AuthMsg struct {
	Event string   `json:"event"`
	Data  AuthInfo `json:"data"`
}

//Handle login event
//return :
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

func UserLogout(userId string, ws *websocket.Conn) {
	ctx, found := ContextMap.Get(userId)
	if !found {
		log.Error("[UserLogout]can't find = " + userId)
		return
	}
	ctx.DelWs(ws)
}

//parseAuthMsg parse authentication message into AuthInfo
func parseAuthMsg(msg string) (AuthInfo, error) {
	authMsg := AuthMsg{}

	err := json.Unmarshal([]byte(msg), &authMsg)
	if err != nil {
		return authMsg.Data, err
	}
	return authMsg.Data, nil
}

//Check auth
//return userId and auth result
func checkAuth(userID, password string) (bool, error) {
	//get user from db
	var user User
	bsonM := bson.M{"userId": userID}
	err := DBGetOne("ircboks", "user", bsonM, &user)
	if err != nil {
		log.Info("[checkAuth] user " + userID + " not found")
		return false, err
	}

	//check password
	return authComparePassword(user.Password, password), nil
}

func authFalseGenStr(reason string) string {
	event := "loginResult"
	data := make(map[string]interface{})
	data["result"] = false

	resp, err := jsonMarshal(event, data)
	if err != nil {
		return "{}"
	}
	return resp
}

//AuthTrueGenStr generate json response when authentication succeed
func authTrueGenStr(clientExist bool, nick, server, user string) string {
	event := "loginResult"
	data := make(map[string]interface{})
	data["result"] = true
	data["ircClientExist"] = clientExist
	if clientExist {
		data["nick"] = nick
		data["server"] = server
		data["user"] = user
	}

	resp, err := jsonMarshal(event, data)
	if err != nil {
		return "{}"
	}
	return resp
}

//check if user already exist
func isUserExist(userId string) bool {
	var user User
	b := bson.M{"userId": userId}
	err := DBGetOne("ircboks", "user", b, &user)
	return (err == nil)
}

//User Registration
func UserRegister(msg string, ws *websocket.Conn) {
	authInfo, _ := parseAuthMsg(msg)

	//check if user already exist
	if isUserExist(authInfo.UserId) {
		log.Info("[registerUser]User '" + authInfo.UserId + "' already registered")
		websocket.Message.Send(ws, `{"event":"registrationResult", "data" : {"result":"failed", "reason":"email address already registered"}}`)
		return
	}

	log.Info("[registerUser] registering " + authInfo.UserId)

	hashedPass, err := authHassPassword(authInfo.Password)
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
	log.Debug("generated password = " + hashedPass)

	uri := Config.GetString("mongodb_uri")

	sess, err := mgo.Dial(uri)
	if err != nil {
		log.Error("Can't connect to mongo, go error :" + err.Error())
		websocket.Message.Send(ws, `{"event":"registrationResult", "data" : {"result":"failed", "reason":"internal DB error"}}`)
		return
	}
	defer sess.Close()

	sess.SetSafe(&mgo.Safe{})
	collection := sess.DB("ircboks").C("user")
	doc := AuthInfo{bson.NewObjectId(), authInfo.UserId, hashedPass}
	err = collection.Insert(doc)
	if err != nil {
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
