default: test
	#is test all ok? :)

test:
	@./node_modules/.bin/mocha test/*.test.* --reporter spec -r should

.PHONY: test
