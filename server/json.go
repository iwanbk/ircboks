package main

import (
	simplejson "github.com/bitly/go-simplejson"
)

//jsonMarshal marshal map to json string
func jsonMarshal(event string, data map[string]interface{}) (string, error) {
	js, err := simplejson.NewJson([]byte("{}"))
	if err != nil {
		return "{}", err
	}
	js.Set("event", event)
	js.Set("data", data)

	b, err := js.MarshalJSON()
	if err != nil {
		return "{}", err
	}
	return string(b), nil
}
