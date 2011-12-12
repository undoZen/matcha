default: test
	#echo 'now you can only make test'

test:
	@./node_modules/.bin/mocha test/*.test.* --reporter spec -r should

.PHONY: test
