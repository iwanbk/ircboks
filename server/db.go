package main

import (
	log "github.com/ngmoco/timber"
	"labix.org/v2/mgo"
	"labix.org/v2/mgo/bson"
)

var mgoSes *mgo.Session

//getSession return cloned session of mongodb connection.
//It will create the connection when needed
func getSession() (*mgo.Session, error) {
	var err error
	if mgoSes == nil {
		mgoSes, err = mgo.Dial(Config.GetString("mongodb_uri"))
		if err != nil {
			log.Error("failed to connect to mongodb :" + err.Error())
			return nil, err
		}
	}
	return mgoSes.Clone(), nil
}

//DBInsert insert a document to a collection
func DBInsert(dbName, collectionName string, doc interface{}) error {
	sess, err := getSession()
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
func DBQueryArr(dbName, colName string, query bson.M, sortStr string, limit, skip int, res interface{}) error {
	sess, err := getSession()
	if err != nil {
		log.Error("[DBQueryArr]Can't connect to mongo. error:", err.Error())
		return err
	}
	defer sess.Close()

	return sess.DB(dbName).C(colName).Find(query).Sort(sortStr).Skip(skip).Limit(limit).All(res)
}

//DBSelectDistinct do similar operation like 'select ... distinct ...' on SQL
func DBSelectDistinct(dbName, colName string, query bson.M, distinctBy string, res interface{}) error {
	sess, err := getSession()
	if err != nil {
		log.Error("[DBSelectDistinct]Error getSession:", err.Error())
		return err
	}
	defer sess.Close()
	return sess.DB(dbName).C(colName).Find(query).Distinct(distinctBy, res)
}

//DBGetOne retrieve a document from DB
func DBGetOne(dbName, colName string, bsonM bson.M, doc interface{}) error {
	sess, err := getSession()
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

//DBUpdateOne update a doc
func DBUpdateOne(dbName, colName, oid string, updateQuery bson.M) error {
	sess, err := getSession()
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
