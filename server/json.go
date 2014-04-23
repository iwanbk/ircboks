package main

import (
	simplejson "github.com/bitly/go-simplejson"
	log "github.com/ngmoco/timber"
)

//jsonMarshal marshal map to json string
func jsonMarshal(event string, data map[string]interface{}) string {
	js, err := simplejson.NewJson([]byte("{}"))
	if err != nil {
		log.Error("jsonMarshal() failed to create simplejson object. Event :" + event + ". error :" + err.Error())
		return "{}"
	}
	js.Set("event", event)
	js.Set("data", data)

	b, err := js.MarshalJSON()
	if err != nil {
		log.Error("jsonMarshal() failed to marshal json. Event :" + event + ". error :" + err.Error())
		return "{}"
	}
	return string(b)
}
