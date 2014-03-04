package main

import (
	"encoding/json"
	"fmt"
)

//EndptMsg is message from/to endpoint
type EndptMsg struct {
	Event  string                 `json:"event"`
	Domain string                 `json:"domain"`
	UserID string                 `json:"userId"`
	Args   []string               `json:"args"`
	Data   map[string]interface{} `json:"data"`
	Raw    string
}

//NewEndptMsgFromStr create new EndptMsg object
func NewEndptMsgFromStr(jsonStr string) (*EndptMsg, error) {
	e := EndptMsg{}
	err := json.Unmarshal([]byte(jsonStr), &e)
	if err != nil {
		return nil, err
	}
	if len(e.Event) == 0 || len(e.Domain) == 0 || len(e.UserID) == 0 {
		return nil, fmt.Errorf("Missing mandatory field.userID=%s, event=%s, domain = %s", e.UserID, e.Event, e.Domain)
	}
	e.Raw = jsonStr
	return &e, nil
}

//GetData retrieve data of a given key
func (e *EndptMsg) GetData(key string) (interface{}, bool) {
	if val, ok := e.Data[key]; ok {
		return val, ok
	}
	return nil, false
}

//GetDataString get data as string
func (e *EndptMsg) GetDataString(key string) (string, bool) {
	if val, ok := e.GetData(key); ok {
		return val.(string), ok
	}
	return "", false

}

//MarshalJson marshal this object into json string
func (e *EndptMsg) MarshalJson() (string, error) {
	b, err := json.Marshal(e)
	if err != nil {
		return "", err
	}
	return string(b), nil
}
