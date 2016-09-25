/* Copyright 2015 Peter Goodman (peter@trailofbits.com), all rights reserved. */

var express = require('express');
var http = require("http");
var https = require("https");
var request = require('request');
var app = express();

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

function debug(str) {
  console.log(str);
}

app.get("/badge/:org/:repo/:branch/:os", function(req, res) {
  
  var org = req.params.org;
  var repo = req.params.repo;
  var branch = req.params.branch;
  var os = req.params.os;
  var options = {
    url: "https://api.travis-ci.org/repos/" + org + "/" + repo + "/builds",
    headers: {
     'Accept': 'application/vnd.travis-ci.2+json'
    }
  };

  // debug("Requestion badge: " + options.url);
  // debug("  Organisation: " + org);
  // debug("  Repository: " + repo);
  // debug("  Branch: " + branch);
  // debug("  Operating System: " + os);

  request(options, function (error, response, body) {
    if (error || response.statusCode != 200) {
      res.status(400);
      return;
    }

    var commit_id = 0;
    var build_id = 0;
    var job_ids = [];
    var build_info = JSON.parse(body);

    build_info.commits.forEach(function (commit) {
      if (branch != commit.branch) {
        return;
      }
      if (commit_id < commit.id) {
        commit_id = commit.id;
      }
    });

    if (!commit_id) {
      res.status(400);
      return;
    }

    // debug("  Commit ID: " + commit_id);

    build_info.builds.forEach(function (build) {
      if (build.commit_id == commit_id) {
        build_id = build.id;
        job_ids = build.job_ids;
      }
    }); 

    if (!build_id) {
      res.status(400);
      return;
    }

    // debug("  Build ID: " + build_id);
    // debug("  Job IDs: " + job_ids.join(" ") + ".");

    job_ids.forEach(function (job_id) {
      options.url = "https://api.travis-ci.org/jobs/" + job_id;

      request(options, function (error, response, body) {
        if (error || response.statusCode != 200) {
          res.status(400);
          return;
        }

        var svg = "";
        var job = JSON.parse(body).job;

        if (job.config.os != os) {
          return;
        }

        if ("passed" == job.state) {
          svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"90\" height=\"20\"><linearGradient id=\"a\" x2=\"0\" y2=\"100%\"><stop offset=\"0\" stop-color=\"#bbb\" stop-opacity=\".1\"/><stop offset=\"1\" stop-opacity=\".1\"/></linearGradient><rect rx=\"3\" width=\"90\" height=\"20\" fill=\"#555\"/><rect rx=\"3\" x=\"37\" width=\"53\" height=\"20\" fill=\"#4c1\"/><path fill=\"#4c1\" d=\"M37 0h4v20h-4z\"/><rect rx=\"3\" width=\"90\" height=\"20\" fill=\"url(#a)\"/><g fill=\"#fff\" text-anchor=\"middle\" font-family=\"DejaVu Sans,Verdana,Geneva,sans-serif\" font-size=\"11\"><text x=\"19.5\" y=\"15\" fill=\"#010101\" fill-opacity=\".3\">build</text><text x=\"19.5\" y=\"14\">build</text><text x=\"62.5\" y=\"15\" fill=\"#010101\" fill-opacity=\".3\">passing</text><text x=\"62.5\" y=\"14\">passing</text></g></svg>";
        } else if ("failed" == job.state) {
          svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"81\" height=\"20\"><linearGradient id=\"a\" x2=\"0\" y2=\"100%\"><stop offset=\"0\" stop-color=\"#bbb\" stop-opacity=\".1\"/><stop offset=\"1\" stop-opacity=\".1\"/></linearGradient><rect rx=\"3\" width=\"81\" height=\"20\" fill=\"#555\"/><rect rx=\"3\" x=\"37\" width=\"44\" height=\"20\" fill=\"#e05d44\"/><path fill=\"#e05d44\" d=\"M37 0h4v20h-4z\"/><rect rx=\"3\" width=\"81\" height=\"20\" fill=\"url(#a)\"/><g fill=\"#fff\" text-anchor=\"middle\" font-family=\"DejaVu Sans,Verdana,Geneva,sans-serif\" font-size=\"11\"><text x=\"19.5\" y=\"15\" fill=\"#010101\" fill-opacity=\".3\">build</text><text x=\"19.5\" y=\"14\">build</text><text x=\"58\" y=\"15\" fill=\"#010101\" fill-opacity=\".3\">failing</text><text x=\"58\" y=\"14\">failing</text></g></svg>";
        } else {
          svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"92\" height=\"20\"><linearGradient id=\"b\" x2=\"0\" y2=\"100%\"><stop offset=\"0\" stop-color=\"#bbb\" stop-opacity=\".1\"/><stop offset=\"1\" stop-opacity=\".1\"/></linearGradient><mask id=\"a\"><rect width=\"92\" height=\"20\" rx=\"3\" fill=\"#fff\"/></mask><g mask=\"url(#a)\"><path fill=\"#555\" d=\"M0 0h37v20H0z\"/><path fill=\"#dfb317\" d=\"M37 0h55v20H37z\"/><path fill=\"url(#b)\" d=\"M0 0h92v20H0z\"/></g><g fill=\"#fff\" text-anchor=\"middle\" font-family=\"DejaVu Sans,Verdana,Geneva,sans-serif\" font-size=\"11\"><text x=\"18.5\" y=\"15\" fill=\"#010101\" fill-opacity=\".3\">build</text><text x=\"18.5\" y=\"14\">build</text><text x=\"63.5\" y=\"15\" fill=\"#010101\" fill-opacity=\".3\">pending</text><text x=\"63.5\" y=\"14\">pending</text></g></svg>";
        }

        res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
        res.end(svg);
      });
    });
  });
});

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});

