start /B code .
WHERE /q conemuc	
IF ERRORLEVEL 1 (
	ECHO ConEmuC wasn't found. Please add me to your path. 
	EXIT /B
)
start conemuc /c tsc -w -p . -new_console:t:"TSC Example" 
start conemuc /c gulp -new_console:t:"GULP Example" 
start conemuc /c nodemon server.js -new_console:t:"NODEMON" 
:end
start http://localhost:3002
