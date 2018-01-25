"use strict";

import Plugin from "../../models/Plugin.js";
import {Loader} from "../../models/Loader.js";

const parsers = require("playlist-parser");
const M3U = parsers.M3U;
const fs = require("fs");

const OmxManager = require('omx-manager');
const manager = new OmxManager(); // OmxManager 

class IPTVplugin extends Plugin {
	
	constructor(path){
		super(path);
		this.playlist = M3U.parse(fs.readFileSync(this.config.playlistFile, { encoding: "utf8" }));
		this.player = null;
		this.currentFile = null;
		this.loader = null;
		this.options = {'--live':true,
						'--loop':true,
						'--threshold': 0.9};
	}
	
	setWindowMode(){
		this.options = {'--live':true,
						'--loop':true,
						'--threshold': 0.9,
						'--win': "372 82 1920 1080"};
	}
	
	setFullScreen(){
		this.options = {'--live':true,
						'--threshold': 0.9,
						'-o': 'hdmi'};
	}
	
	getView(){
		this.view.list = this.playlist;
		for(var i in this.view.list){
			this.view.list[i]["itemId"]= i;
			this.view.list[i]["event"]= "clientSendIPTVMedia";
		}
		return this.view;
	}
	
	setService(service){
		this.service= service;
		var obj=this;
		this.service.pluginsEvents.on("clientStopIPTVMedia", function(data){
			console.log("clientStopIPTVMedia");
			if(obj.loader){
				obj.loader.stop();
			}
			obj.stop();
		});
	}
	
	suscribeEvent(socketClient){
		const obj= this;
		socketClient.on("clientSendIPTVMedia", function(data){
			console.log("clientSendIPTVMedia");
			console.log(data);
			if(obj.loader){
				obj.loader.stop();
			}
			obj.loader = new Loader(data.title);
			obj.loader.show();
			obj.currentFile = data.file;
			obj.playStreamFile(data.file);
		});
		
		socketClient.on("clientStopIPTVMedia", function(data){
			console.log("clientStopIPTVMedia");
			obj.stop();
		});
		
		socketClient.on("clientPauseIPTVMedia", function(data){
			console.log("clientPauseIPTVMedia");
			obj.pause();
		});
	}
	
	doRequest(id, data) {
		console.log("request : "+id);
		if(id==="putChannel"){
			console.log("channel : "+data.channelName);
			var channel = this.searchChannelByName(data.channelName);
			if(channel!=null){
				if(this.loader){
					this.loader.stop();
				}
				this.loader = new Loader(data.channelName);
				this.loader.show();
				this.currentFile = channel.file;
				this.playStreamFile(channel.file);
				return "Ok je met "+data.channelName;
			}
		}else if(id=="pauseTV"){
			this.pause();
			return "Ok, je met sur pause";
		}else if(id=="stopTV"){
			this.stop();
			return "Ok";
		}else if(id=="windowModeTV"){
			this.setWindowMode();
			this.playStreamFile(this.currentFile);
			return "Ok";
		}else if(id=="fullscreenTV"){
			this.setFullScreen();
			this.playStreamFile(this.currentFile);
			return "Ok";
		}
		return null;
	}
	
	playStreamFile(file){
		if(this.player!=null){
			this.player.stop();
		}
		this.service.pluginsEvents.emit("clientSTOPVODMedia", null);
		this.service.pluginsEvents.emit("clientStopVideoEvent", null);
		
		this.player = manager.create(file, this.options);
		this.player.play();									
	}
	
	stop(){
		if(this.loader){
			this.loader.stop();
		}
		if(this.player!=null){
			this.player.stop();
		}
		this.player= null;
	}
	
	pause(){
		if(this.player!=null){
			this.player.pause();
		}
	}
	
	searchChannelByName(name){
		for(var i in this.playlist){
			if(this.playlist[i].title===name){
				return this.playlist[i];
			}
		}
		return null;
	}
	
	
	
}

export default new IPTVplugin(__dirname);