package main

import (
	"encoding/json"
	log "github.com/ngmoco/timber"
)

//jsonMarshal marshal map to json string
//this function is deprecated, we should use EndptMsg.MarshalJson
func jsonMarshal(event string, data map[string]interface{}) string {
	em := &EndptMsg{Event: event, Data: data}

	b, err := json.Marshal(em)
	if err != nil {
		log.Error("jsonMarshal() failed. err =", err.Error())
		return "{}"
	}
	return string(b)
}
