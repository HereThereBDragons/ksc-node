/**
 * User: Marius
 * Date: 15.02.2015
 * Time: 11:04
 */

var log = require("./logging");

var fs = require("fs");
var config = require("config");
var merge = require("merge");

module.exports = function (ksc, vafb, socketServer)
{
    // This object will be sent to the clients whenever one of the listeners has new data
    // ksc and vafb are initialized with empty data
    var outputObject = {
        ksc : {raw: {}},
        vafb: {raw: {}}
    };

    var writingFile = false;
    var writeToLegacy = function ()
    {
        if (writingFile)
        {
            // Don't try to write the file again, it will only cause errors...
            return;
        }

        writingFile = true;
        fs.writeFile(
                config.get("Countdown.legacyFile"),
                JSON.stringify(outputObject),
                function (e)
                {
                    writingFile = false;
                    if (e)
                    {
                        log.warn("Error writing legacy file: " + e.toString());
                    }
                }
        );
    };
    var parseDate = function (dateString)
    {
        var parts = dateString.split(':');
        if (!parts)
        {
            return 0;
        }

        var partMultipliers = [86400, 3600, 60, 1];
        var ts;

        switch (parts.length)
        {
            case 3:
                parts.unshift('0');
                ts = Math.floor(new Date().setUTCHours(0, 0, 0, 0) / 1000);
                break;
            case 4:
                ts = Math.floor(Date.UTC(new Date().getUTCFullYear(), 0, 1) / 1000);
                break;
            default:
                // Oh gods, what even is this date
                return 0;
        }

        for (var i = 0; i < parts.length; i++)
        {
            ts += (parseInt(parts[i], 10) * partMultipliers[i]);
        }

        return ts;
    };

    var processRawData = function (rawData)
    {
        var events = [];
        var out = {};
        out.times = {};

        if (rawData['GMTTSTRG01'])
        {
            out.times.gmt = parseDate(rawData['GMTTSTRG01']);
        }

        if (rawData['LOCLSTRG02'])
        {
            out.tz = rawData['LOCLSTRG02'];
        }

        if (rawData['LOCTSTRG03'])
        {
            out.times.local = parseDate(rawData['LOCTSTRG03']);
        }

        if (rawData['BIHTSTRG04'])
        {
            out.hold = rawData['BIHTSTRG04'];
        }

        if (rawData['WOTTSTRG06'])
        {
            out.times.windowOpens = parseDate(rawData['WOTTSTRG06']);
        }

        if (rawData['ELOTSTRG07'])
        {
            out.times.expected = parseDate(rawData['ELOTSTRG07']);
        }

        if (rawData['ALOLSTRG08'] && rawData['ALOTSTRG09'])
        {
            if (!out.times.custom)
            {
                out.times.custom = [];
            }
            out.times.custom.push({
                                      label: rawData['ALOLSTRG08'],
                                      time : parseDate(rawData['ALOTSTRG09'])
                                  });
        }

        if (rawData['LTMLSTRG10'] && rawData['LMTTSTRG11'])
        {
            if (!out.times.custom)
            {
                out.times.custom = [];
            }
            out.times.custom.push({
                                      label: rawData['LTMLSTRG10'],
                                      time : parseDate(rawData['LTMTSTRG11'])
                                  });
        }

        if (rawData['TTMLSTRG12'] && rawData['TTMTSTRG13'])
        {
            if (!out.times.custom)
            {
                out.times.custom = [];
            }
            out.times.custom.push({
                                      label: rawData['TTMLSTRG12'],
                                      time : parseDate(rawData['TTMTSTRG13'])
                                  });
        }

        if (rawData['RTMLSTRG14'] && rawData['RTMTSTRG15'])
        {
            if (!out.times.custom)
            {
                out.times.custom = [];
            }
            out.times.custom.push({
                                      label: rawData['RTMLSTRG14'],
                                      time : parseDate(rawData['RTMTSTRG15'])
                                  });
        }

        if (rawData['VHCLSTRG16'])
        {
            out.vehicle = rawData['VHCLSTRG16'];
        }

        if (rawData['SPCFSTRG17'])
        {
            out.spacecraft = rawData['SPCFSTRG17'];
        }

        for (var i = 1; i < 11; i++)
        {
            var j = ("0" + i).slice(-2);
            if (rawData['EVENTLBL' + j] && rawData['EVENTLBL' + j].length)
            {
                events.push({
                                label: rawData['EVENTLBL' + j],
                                time : rawData['EVENTTIM' + j]
                            });
            }
        }
        if (events.length)
        {
            out.events = events;
        }

        out.generated = Math.floor(Date.now() / 1000);

        return out;
    };

    var getListener = function (key)
    {
        return function (data)
        {
            var processed = processRawData(data.raw);
            outputObject[key] = merge(processed, data); // data already contains the generated field
            socketServer.sendToAll(outputObject);
            writeToLegacy();
        };
    };

    ksc.onData(getListener("ksc"));

    vafb.onData(getListener("vafb"))
};
