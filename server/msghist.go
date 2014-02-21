//message history
package main

import (
	"code.google.com/p/go.net/websocket"
	"encoding/json"
	log "github.com/ngmoco/timber"
	"labix.org/v2/mgo/bson"
)

//channel history request data
type chanHistReqData struct {
	Channel string `json="channel"`
	UserId  string `json="userId"`
}

//channel history request
type chanHistReq struct {
	Event string          `json="event"`
	Data  chanHistReqData `json="data"`
}

//nick history request data
type nickHistReqData struct {
	Sender string `json="sender"`
	Target string `json="target"`
	UserId string `json="userId"`
}

//nick history request
type nickHistReq struct {
	Event string          `json="event"`
	Data  nickHistReqData `json="data"`
}

//get channel message history
func MsgHistChannel(msgStr string, ws *websocket.Conn) {
	//parse request
	msg := chanHistReq{}
	err := json.Unmarshal([]byte(msgStr), &msg)
	if err != nil {
		log.Error("Error marshalling msghistChannel request")
		return
	}

	log.Debug("[MsgHistChannel] userId=" + msg.Data.UserId + ".channel = " + msg.Data.Channel)
	//get data from DB
	var res []MessageHist

	query := bson.M{"userId": msg.Data.UserId, "target": msg.Data.Channel}
	err = DBQueryArr("ircboks", "msghist", query, "-timestamp", 40, &res)
	if err != nil {
		log.Error("[MsgHistChannel]fetching channel history:" + err.Error())
		return
	}

	//build json string
	m := make(map[string]interface{})
	m["logs"] = res
	m["channel"] = msg.Data.Channel

	event := "msghistChannel"
	jsStr, err := jsonMarshal(event, m)
	if err != nil {
		log.Error("[MsgHistChannel] failed to marshalling json = " + err.Error())
	}

	//send the result
	websocket.Message.Send(ws, jsStr)
}

//getNickLog
func MsgHistNick(msgStr string, ws *websocket.Conn) {
	//parse request
	msg := nickHistReq{}
	err := json.Unmarshal([]byte(msgStr), &msg)
	if err != nil {
		log.Error("Error marshalling getNickLog request")
		return
	}

	//get data from DB
	var hists []MessageHist

	query := bson.M{"userId": msg.Data.UserId, "target": msg.Data.Target, "nick": msg.Data.Sender}
	err = DBQueryArr("ircboks", "msghist", query, "-timestamp", 40, &hists)
	if err != nil {
		log.Error("[MsgHistNick]fetching channel nick:" + err.Error())
		return
	}

	//build json
	m := make(map[string]interface{})
	m["logs"] = hists
	m["sender"] = msg.Data.Sender
	m["target"] = msg.Data.Target

	event := "msghistNickResp"

	jsStr, err := jsonMarshal(event, m)
	if err != nil {
		log.Error("[MsgHistNick] failed to marshalling json = " + err.Error())
	}

	//send it back
	websocket.Message.Send(ws, jsStr)
}
