
(function( $ ){

    $.fn.slabText = function(options) {

        var settings = {
            // The ratio used when calculating the characters per line
            // (parent width / (font-size * fontRatio)).
            "fontRatio"             : 0.78,
            // Always recalculate the characters per line, not just when the
            // font-size changes? Defaults to true (CPU intensive)
            "forceNewCharCount"     : true,
            // Do we wrap ampersands in <span class="amp">
            "wrapAmpersand"         : true,
            // Under what pixel width do we remove the slabtext styling?
            "headerBreakpoint"      : null,
            "viewportBreakpoint"    : null,
            // Don't attach a resize event
            "noResizeEvent"         : false,
            // By many milliseconds do we throttle the resize event
            "resizeThrottleTime"    : 300,
            // The maximum pixel font size the script can set
            "maxFontSize"           : 999,
            // Do we try to tweak the letter-spacing or word-spacing?
            "postTweak"             : true,
            // Decimal precision to use when setting CSS values
            "precision"             : 3,
            // The min num of chars a line has to contain
            "minCharsPerLine"       : 0
            };

       
        $("body").addClass("slabtexted");

        return this.each(function(){

            if(options) {
                $.extend(settings, options);
            };

            var $this               = $(this),
                keepSpans           = $("span.slabtext", $this).length,
                words               = keepSpans ? [] : String($.trim($this.text())).replace(/\s{2,}/g, " ").split(" "),
                origFontSize        = null,
                idealCharPerLine    = null,
                fontRatio           = settings.fontRatio,
                forceNewCharCount   = settings.forceNewCharCount,
                headerBreakpoint    = settings.headerBreakpoint,
                viewportBreakpoint  = settings.viewportBreakpoint,
                postTweak           = settings.postTweak,
                precision           = settings.precision,
                resizeThrottleTime  = settings.resizeThrottleTime,
                minCharsPerLine     = settings.minCharsPerLine,
                resizeThrottle      = null,
                viewportWidth       = $(window).width(),
                headLink            = $this.find("a:first").attr("href") || $this.attr("href"),
                linkTitle           = headLink ? $this.find("a:first").attr("title") : "";

            if(!keepSpans && minCharsPerLine && words.join(" ").length < minCharsPerLine) {
                return;
            };

        
            var grabPixelFontSize = function() {
                var dummy = jQuery('<div style="display:none;font-size:1em;margin:0;padding:0;height:auto;line-height:1;border:0;">&nbsp;</div>').appendTo($this),
                    emH   = dummy.height();
                dummy.remove();
                return emH;
            };

         
            var resizeSlabs = function resizeSlabs() {

                var parentWidth = $this.width(),
                    fs;

                if(parentWidth === 0) {
                    return;
                };

                $this.removeClass("slabtextdone slabtextinactive");

                if(viewportBreakpoint && viewportBreakpoint > viewportWidth
                   ||
                   headerBreakpoint && headerBreakpoint > parentWidth) {
                
                    $this.addClass("slabtextinactive");
                    return;
                };

                fs = grabPixelFontSize();
               
                if(!keepSpans && (forceNewCharCount || fs != origFontSize)) {

                    origFontSize = fs;

                    var newCharPerLine      = Math.min(60, Math.floor(parentWidth / (origFontSize * fontRatio))),
                        wordIndex           = 0,
                        lineText            = [],
                        counter             = 0,
                        preText             = "",
                        postText            = "",
                        finalText           = "",
                        slice,
                        preDiff,
                        postDiff;

                    if(newCharPerLine != idealCharPerLine) {
                        idealCharPerLine = newCharPerLine;

                        while (wordIndex < words.length) {

                            postText = "";

                         
                            while (postText.length < idealCharPerLine) {
                                preText   = postText;
                                postText += words[wordIndex] + " ";
                                if(++wordIndex >= words.length) {
                                    break;
                                };
                            };

              
                            if(minCharsPerLine) {
                                slice = words.slice(wordIndex).join(" ");
                                if(slice.length < minCharsPerLine) {
                                    postText += slice;
                                    preText = postText;
                                    wordIndex = words.length + 2;
                                };
                            };

                 
                            preDiff  = idealCharPerLine - preText.length;
                            postDiff = postText.length - idealCharPerLine;

                            if((preDiff < postDiff) && (preText.length >= (minCharsPerLine || 2))) {
                                finalText = preText;
                                wordIndex--;
                            // otherwise, use the longer string for the line
                            } else {
                                finalText = postText;
                            };

                            // HTML-escape the text
                            finalText = $('<div/>').text(finalText).html()

                            // Wrap ampersands in spans with class `amp` for specific styling
                            if(settings.wrapAmpersand) {
                                finalText = finalText.replace(/&amp;/g, '<span class="amp">&amp;</span>');
                            };

                            finalText = $.trim(finalText);

                            lineText.push('<span class="slabtext">' + finalText + "</span>");
                        };

                        $this.html(lineText.join(" "));
                        // If we have a headLink, add it back just inside our target, around all the slabText spans
                        if(headLink) {
                            $this.wrapInner('<a href="' + headLink + '" ' + (linkTitle ? 'title="' + linkTitle + '" ' : '') + '/>');
                        };
                    };
                } else {
                    // We only need the font-size for the resize-to-fit functionality
                    // if not injecting the spans
                    origFontSize = fs;
                };

                $("span.slabtext", $this).each(function() {
                    var $span       = $(this),
                        // the .text method appears as fast as using custom -data attributes in this case
                        innerText   = $span.text(),
                        wordSpacing = innerText.split(" ").length > 1,
                        diff,
                        ratio,
                        fontSize;

                    if(postTweak) {
                        $span.css({
                            "word-spacing":0,
                            "letter-spacing":0
                            });
                    };

                    ratio    = parentWidth / $span.width();
                    fontSize = parseFloat(this.style.fontSize) || origFontSize;

                    $span.css("font-size", Math.min((fontSize * ratio).toFixed(precision), settings.maxFontSize) + "px");

                    // Do we still have space to try to fill or crop
                    diff = !!postTweak ? parentWidth - $span.width() : false;

                    // A "dumb" tweak in the blind hope that the browser will
                    // resize the text to better fit the available space.
                    // Better "dumb" and fast...
                    if(diff) {
                        $span.css((wordSpacing ? 'word' : 'letter') + '-spacing', (diff / (wordSpacing ? innerText.split(" ").length - 1 : innerText.length)).toFixed(precision) + "px");
                    };
                });

                // Add the class slabtextdone to set a display:block on the child spans
                // and avoid styling & layout issues associated with inline-block
                $this.addClass("slabtextdone");
            };

            // Immediate resize
            resizeSlabs();

            if(!settings.noResizeEvent) {
                $(window).resize(function() {
                    // Only run the resize code if the viewport width has changed.
                    // we ignore the viewport height as it will be constantly changing.
                    if($(window).width() == viewportWidth) {
                        return;
                    };

                    viewportWidth = $(window).width();

                    clearTimeout(resizeThrottle);
                    resizeThrottle = setTimeout(resizeSlabs, resizeThrottleTime);
                });
            };
        });
    };
})(jQuery);
