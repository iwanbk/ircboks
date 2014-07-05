package main

import (
	"github.com/jinzhu/gorm"
	_ "github.com/mattn/go-sqlite3"
)

func DBSQLInit() (gorm.DB, error) {
	//open
	db, err := gorm.Open("sqlite3", "data.db")
	if err != nil {
		return db, err
	}

	//db.LogMode(true)

	//automigrate
	db.AutoMigrate(MessageHist{})
	db.AutoMigrate(User{})
	return db, nil
}
