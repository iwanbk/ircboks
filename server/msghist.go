//message history
package main

import (
	"code.google.com/p/go.net/websocket"
	"encoding/json"
	log "github.com/ngmoco/timber"
	"labix.org/v2/mgo/bson"
)

//MessageHist represent a message history
type MessageHist struct {
	Id        bson.ObjectId `bson:"_id"`
	UserId    string        `bson:"userId"`
	Target    string        `bson:"target"`
	Nick      string        `bson:"nick"`
	Message   string        `bson:"message"`
	Timestamp int64         `bson:"timestamp"`
	ReadFlag  bool          `bson:"read_flag"`
	ToChannel bool          `bson:"to_channel"`
}

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
	Nick   string `json="nick"`
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
	err = DBQueryArr("ircboks", "msghist", query, "-timestamp", 50, &res)
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

	query1 := bson.M{"userId": msg.Data.UserId, "nick": msg.Data.Nick, "to_channel": false} //message from this nick, not in channel
	query2 := bson.M{"userId": msg.Data.UserId, "target": msg.Data.Nick}                    //message to this nick

	query := bson.M{"$or": []bson.M{query1, query2}}
	err = DBQueryArr("ircboks", "msghist", query, "-timestamp", 50, &hists)
	if err != nil {
		log.Error("[MsgHistNick]fetching channel nick:" + err.Error())
		return
	}

	//build json
	m := make(map[string]interface{})
	m["logs"] = hists
	m["nick"] = msg.Data.Nick

	event := "msghistNickResp"

	jsStr, err := jsonMarshal(event, m)
	if err != nil {
		log.Error("[MsgHistNick] failed to marshalling json = " + err.Error())
	}

	//send it back
	websocket.Message.Send(ws, jsStr)
}

type MsgHistMarkReadReqData struct {
	UserId string   `json="userId"`
	Oids   []string `json="oids"`
}
type MsgHistMarkReadReq struct {
	Event string                 `json="event"`
	Data  MsgHistMarkReadReqData `json="data"`
}

//MsgHistMarkRead mark messages readFlag as read
func MsgHistMarkRead(msgStr string) {
	msg := MsgHistMarkReadReq{}
	err := json.Unmarshal([]byte(msgStr), &msg)
	if err != nil {
		log.Error("MsgHistMarkRead(): error unmarshalling json:" + err.Error())
		return
	}
	for _, oid := range msg.Data.Oids {
		updQuery := bson.M{"$set": bson.M{"read_flag": true}}

		DBUpdateOne("ircboks", "msghist", oid, updQuery)
	}
}
