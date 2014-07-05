//message history
package main

import (
	"strconv"

	"code.google.com/p/go.net/websocket"
	log "github.com/ngmoco/timber"
)

//MessageHist represent a message history
type MessageHist struct {
	Id        int64  `json:"Id"`
	UserId    string `json:"UserId"`
	Target    string //message target/receiver
	Nick      string //sender's nick
	Message   string //message content
	Timestamp int64  //server timestamp
	ReadFlag  bool   //true if this message already read by user
	ToChannel bool   //true if it is message to channel
	Incoming  bool   //true if it is incoming message
}

//MsgHistChannel get message history of a channel
//It will fetch message history from the latest to oldest
func MsgHistChannel(em *EndptMsg, ws *websocket.Conn) {
	channel, ok := em.GetDataString("channel")
	if !ok {
		log.Error("MsgHistChannel() null channel")
		return
	}

	log.Debug("[MsgHistChannel] userId=" + em.UserID + ".channel = " + channel)

	i := 0
	for {
		var res []MessageHist

		db := DB.Offset(100 * i).Limit(100).Order("timestamp desc")
		if err := db.Where("user_id=? and target=?", em.UserID, channel).Find(&res).Error; err != nil {
			log.Error("[MsgHistChannel]fetching channel history:" + err.Error())
			return
		}
		m := map[string]interface{}{
			"logs":    res,
			"channel": channel,
		}

		//send the result
		websocket.Message.Send(ws, jsonMarshal("msghistChannel", m))

		if len(res) == 0 || res[len(res)-1].ReadFlag == true {
			break
		}
		i = i + 1
	}
}

//MsgHistNick get message history of a nick
func MsgHistNick(em *EndptMsg, ws *websocket.Conn) {
	nick, ok := em.GetDataString("nick")
	if !ok {
		log.Error("MsgHistNick() empty nick")
		return
	}
	msgHistNick(em.UserID, nick, ws)
}

func msgHistNick(userID, nick string, ws *websocket.Conn) {
	i := 0
	for {
		var hists []MessageHist

		db := DB.Offset(100 * i).Limit(100).Order("timestamp desc")
		db = db.Where("user_id=? and nick=? and to_channel=?", userID, nick, false)
		db = db.Or("user_id=? and target=?", userID, nick)
		if err := db.Find(&hists).Error; err != nil {
			log.Error("[MsgHistNick]fetching channel nick:" + err.Error())
			return
		}

		m := map[string]interface{}{
			"logs": hists,
			"nick": nick,
		}

		//send it back
		websocket.Message.Send(ws, jsonMarshal("msghistNickResp", m))

		if len(hists) == 0 || hists[len(hists)-1].ReadFlag == true {
			break
		}
		i++
	}
}

//MsgHistNicksUnread get all unread messages that is not from channel
func MsgHistNicksUnread(em *EndptMsg, ws *websocket.Conn) {
	var unreadNicks []string

	queryStr := "select distinct nick from message_hists" +
		" where user_id=? and to_channel=? and read_flag=?"

	rows, err := DB.Raw(queryStr, em.UserID, false, false).Rows()

	if err != nil {
		log.Error("MsgHistNicksUnread:selecr distinct err :" + err.Error())
		return
	}

	for rows.Next() {
		var nick string
		rows.Scan(&nick)
		unreadNicks = append(unreadNicks, nick)
	}

	m := map[string]interface{}{
		"nicks": unreadNicks,
	}

	websocket.Message.Send(ws, jsonMarshal("msghistNicksUnread", m))

}

//MsgHistMarkRead mark messages readFlag as read
func MsgHistMarkRead(em *EndptMsg, ws *websocket.Conn) {
	oids := em.Args
	if len(oids) == 0 {
		log.Error("MsgHistMarkRead() empty oids")
		return
	}
	for _, oid := range oids {
		id, err := strconv.Atoi(oid)
		if err != nil {
			log.Error("invalid id:%s", err.Error())
			continue
		}
		if err := DB.Table("message_hists").Where("id=?", id).Update("read_flag", true).Error; err != nil {
			log.Error("update read_flag err = %s", err.Error())
		}
	}
}

//MsgHistInsert save a message to DB
func MsgHistInsert(userID, target, nick, message string, timestamp int64, readFlag, incoming bool) int64 {
	toChannel := false
	if string(target[0]) == "#" {
		toChannel = true
	}

	h := MessageHist{
		UserId:    userID,
		Target:    target,
		Nick:      nick,
		Message:   message,
		Timestamp: timestamp,
		ReadFlag:  readFlag,
		ToChannel: toChannel,
		Incoming:  incoming}

	if err := DB.Save(&h).Error; err != nil {
		log.Error("[insertMsgHistory] failed : " + err.Error())
	}
	return h.Id
}
