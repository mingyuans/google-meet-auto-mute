DIST_DIR := dist
EXTENSION_NAME := google-meet-auto-mute

.PHONY: pack clean

pack: clean
	mkdir -p $(DIST_DIR)
	cp manifest.json $(DIST_DIR)/
	cp content.js $(DIST_DIR)/
	cp background.js $(DIST_DIR)/
	cp popup.html $(DIST_DIR)/
	cp styles.css $(DIST_DIR)/
	cp -r icons $(DIST_DIR)/
	@echo "Extension packed to $(DIST_DIR)/ - load it in Chrome via 'Load unpacked'"

clean:
	rm -rf $(DIST_DIR)
