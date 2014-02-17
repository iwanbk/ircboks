package main

import (
	simplejson "github.com/bitly/go-simplejson"
)

func jsonMarshal(event string, data map[string]interface{}) (string, error) {
	js, _ := simplejson.NewJson([]byte("{}"))
	js.Set("event", event)
	js.Set("data", data)

	jsStr, err := simpleJsonToString(js)
	if err != nil {
		return "", err
	}
	return jsStr, nil
}

//convert simplejson object to string
func simpleJsonToString(json *simplejson.Json) (string, error) {
	b, err := json.MarshalJSON()
	if err != nil {
		return "", err
	}
	return string(b), nil
}
