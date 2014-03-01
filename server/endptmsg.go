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

func (e *EndptMsg) GetUserID() (string, bool) {
	if len(e.UserID) > 0 {
		return e.UserID, true
	}
	if userID, ok := e.Data["userId"]; ok {
		return userID.(string), true
	}
	return "", false
}

func (e *EndptMsg) GetData(key string) (interface{}, bool) {
	if val, ok := e.Data[key]; ok {
		return val, ok
	}
	return nil, false
}

func (e *EndptMsg) GetDataString(key string) (string, bool) {
	if val, ok := e.GetData(key); ok {
		return val.(string), ok
	}
	return "", false

}
