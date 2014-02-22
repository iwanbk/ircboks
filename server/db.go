package main

import (
	log "github.com/ngmoco/timber"
	"labix.org/v2/mgo"
	"labix.org/v2/mgo/bson"
)

type MessageHist struct {
	Id        bson.ObjectId `bson:"_id"`
	UserId    string        `bson:"userId"`
	Target    string        `bson:"target"`
	Nick      string        `bson:"nick"`
	Message   string        `bson:"message"`
	Timestamp int64         `bson:"timestamp"`
	ReadFlag  bool          `bson:"read_flag"`
}

type User struct {
	Id       bson.ObjectId `bson:"_id"`
	UserId   string        `bson:"userId"`
	Password string        `bson:"password"`
}

//DBInsert insert a document to a collection
func DBInsert(dbName, collectionName string, doc interface{}) error {
	sess, err := mgo.Dial(Config.GetString("mongodb_uri"))
	if err != nil {
		return err
	}
	defer sess.Close()

	sess.SetSafe(&mgo.Safe{})
	col := sess.DB(dbName).C(collectionName)

	err = col.Insert(doc)
	if err != nil {
		return err
	}

	return nil
}

//DBQueryArr retrieve array of document from mongodb server
func DBQueryArr(dbName, colName string, query bson.M, sortStr string, limit int, res interface{}) error {
	sess, err := mgo.Dial(Config.GetString("mongodb_uri"))
	if err != nil {
		log.Error("[DBQueryArr]Can't connect to mongo, go error %v\n", err)
		return err
	}
	defer sess.Close()

	return sess.DB(dbName).C(colName).Find(query).Sort(sortStr).Limit(limit).All(res)
}

//DBGetOne retrieve a document from DB
func DBGetOne(dbName, colName string, bsonM bson.M, doc interface{}) error {
	sess, err := mgo.Dial(Config.GetString("mongodb_uri"))
	if err != nil {
		log.Error("[DBGetOne]failed to connect to server :" + err.Error())
		return nil
	}
	defer sess.Close()

	col := sess.DB(dbName).C(colName)
	err = col.Find(bsonM).One(doc)
	if err != nil {
		//TODO : handle in case error is not "not found" error
		return err
	}
	return nil
}

func DBUpdateOne(dbName, colName, oid string, updateQuery bson.M) error {
	sess, err := mgo.Dial(Config.GetString("mongodb_uri"))
	if err != nil {
		log.Error("[DBUpdateOne]failed to connect to server :" + err.Error())
		return nil
	}
	defer sess.Close()

	sess.SetSafe(&mgo.Safe{})

	err = sess.DB(dbName).C(colName).Update(bson.M{"_id": bson.ObjectIdHex(oid)}, updateQuery)
	if err != nil {
		log.Error("[DBUpdateOne]dbName = " + dbName + ".collection = " + colName + ".oid = " + oid + ". err = " + err.Error())
	}
	return err
}
