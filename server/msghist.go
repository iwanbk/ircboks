//message history
package main

import (
	"code.google.com/p/go.net/websocket"
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

//MsgHistChannel get message history of a channel
func MsgHistChannel(em *EndptMsg, ws *websocket.Conn) {
	channel, ok := em.GetDataString("channel")
	if !ok {
		log.Error("MsgHistChannel() null channel")
		return
	}

	log.Debug("[MsgHistChannel] userId=" + em.UserID + ".channel = " + channel)
	//get data from DB
	var res []MessageHist

	query := bson.M{"userId": em.UserID, "target": channel}
	err := DBQueryArr("ircboks", "msghist", query, "-timestamp", 50, &res)
	if err != nil {
		log.Error("[MsgHistChannel]fetching channel history:" + err.Error())
		return
	}

	//build json string
	m := make(map[string]interface{})
	m["logs"] = res
	m["channel"] = channel

	event := "msghistChannel"
	jsStr, err := jsonMarshal(event, m)
	if err != nil {
		log.Error("[MsgHistChannel] failed to marshalling json = " + err.Error())
	}

	//send the result
	websocket.Message.Send(ws, jsStr)
}

//MsgHistNick get message history of a nick
func MsgHistNick(em *EndptMsg, ws *websocket.Conn) {
	nick, ok := em.GetDataString("nick")
	if !ok {
		log.Error("MsgHistNick() empty nick")
		return
	}
	//get data from DB
	var hists []MessageHist

	query1 := bson.M{"userId": em.UserID, "nick": nick, "to_channel": false} //message from this nick, not in channel
	query2 := bson.M{"userId": em.UserID, "target": nick}                    //message to this nick

	query := bson.M{"$or": []bson.M{query1, query2}}
	err := DBQueryArr("ircboks", "msghist", query, "-timestamp", 50, &hists)
	if err != nil {
		log.Error("[MsgHistNick]fetching channel nick:" + err.Error())
		return
	}

	//build json
	m := make(map[string]interface{})
	m["logs"] = hists
	m["nick"] = nick

	event := "msghistNickResp"

	jsStr, err := jsonMarshal(event, m)
	if err != nil {
		log.Error("[MsgHistNick] failed to marshalling json = " + err.Error())
	}

	//send it back
	websocket.Message.Send(ws, jsStr)
}

//MsgHistMarkRead mark messages readFlag as read
func MsgHistMarkRead(em *EndptMsg) {
	oids := em.Args
	if len(oids) == 0 {
		log.Error("MsgHistMarkRead() empty oids")
		return
	}
	for _, oid := range oids {
		updQuery := bson.M{"$set": bson.M{"read_flag": true}}

		DBUpdateOne("ircboks", "msghist", oid, updQuery)
	}
}
