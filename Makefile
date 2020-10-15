SHELL := /bin/bash
RM = rm --recursive --force
CONFIG_SCRIPT = tools/configure.py
.DEFAULT_GOAL := info
JS_LINT = eslint --no-color
CSS_LINT = csslint --quiet --ignore=ids,adjoining-classes
# CSSOLDLINTFLAGS = --quiet --errors=empty-rules,import,errors --warnings=duplicate-background-images,compatible-vendor-prefixes,display-property-grouping,fallback-colors,duplicate-properties,shorthand,gradients,font-sizes,floats,overqualified-elements,import,regex-selectors,rules-count,unqualified-attributes,vendor-prefix,zero-units
JSON_LINT = jsonlint --quiet
PYTHON_LINT = pylint --disable=C,bad-indentation --reports=n
# Can be overridden by env varis, such as ODSA_ENV='PROD' or PYTHON="python3.8"
ODSA_ENV ?= DEV
PYTHON ?= python
ACTIVATE = source .pyVenv/bin/activate 
# If OS is not obvious to make, then try another identifier
ifeq ($(OS),)
	OS = $(shell uname -s)
endif
# OSX and Darwin don't support long command options...
ifeq ($(OS),Darwin) 
	RM = rm -rf
endif
# Changes for installs on native Windows:
ifeq ($(OS),Windows_NT) 
	SHELL = cmd.exe
	ACTIVATE = . .pyVenv/Scripts/activate 
endif
ifeq ($(SHELL),cmd.exe) 
	ACTIVATE = .pyVenv\\Scripts\\activate.bat
endif
VENV_PYTHON = $(ACTIVATE) && python 
# VENV_PYTHON = .pyVenv/Scripts/python 
# VENV_PYTHON = python 

JS_MINIFY = uglifyjs --comments '/^!|@preserve|@license|@cc_on/i' -- 
CSS_MINIFY = cleancss
MINIFY_MSG := 'Completed: Minify of many .js and .css files'
ifeq ($(strip $(ODSA_ENV)),DEV)
	# fake-minify for easier debugging in DEV setups...
	JS_MINIFY = cat 
	CSS_MINIFY = cat
	MINIFY_MSG := 'Completed: FAKE-Minify of many .js and .css files (just copied)'
endif

# For the python virtual environment:
.PHONY: venv clean-venv info
venv .pyVenv: .pyVenv/.pipMarker
.pyVenv/.pipMarker: .pyVenv/.venvMarker requirements.txt 
	$(ACTIVATE) && pip install --requirement requirements.txt
	touch $@
.pyVenv/.venvMarker: 
	@echo "Using env variable: PYTHON=$(PYTHON)"
	@$(PYTHON) --version
	$(PYTHON) -m venv .pyVenv
	$(VENV_PYTHON) -m pip install --upgrade setuptools pip
	touch $@
clean-venv:
	-$(RM) .pyVenv
	@echo "Note: Use 'deactivate' if .pyVenv is still activated"
info:
	@echo OS is $(OS) and SHELL is $(SHELL)
	@echo ODSA_ENV is $(ODSA_ENV) and PYTHON is $(PYTHON)
	@$(PYTHON) --version
	@$(PYTHON) -c "import platform; print(platform.platform())"
	$(VENV_PYTHON) testEnv.py

.PHONY: clean min pull Webserver 

Webserver: 
	$(PYTHON) server.py

pull:
	git pull
	git submodule init
	git submodule update

clean:
	- $(RM) *~
	- $(RM) Books
	- $(RM) lib/*-min.*
	- $(RM) Doc/*~
	- $(RM) Scripts/*~
	- $(RM) config/*~

.PHONY: alllint jsonlint lint lintExe csslint pylint
alllint: lint csslint jsonlint pyLint

csslint:
	@echo 'running csslint'
	$(CSS_LINT) $(wildcard AV/Background/*.css)
	$(CSS_LINT) $(wildcard AV/Design/*.css)

TODOcsslint:
	@$(CSS_LINT) $(wildcard AV/List/*.css)
	@$(CSS_LINT) $(wildcard AV/Sorting/*.css)
	@$(CSS_LINT) $(wildcard AV/Hashing/*.css)
	@$(CSS_LINT) $(wildcard AV/Searching/*.css)
	@$(CSS_LINT) $(wildcard lib/*.css)
	@$(CSS_LINT) $(wildcard AV/*.css)

lint: lintExe
	@echo 'running eslint'
	-@$(JS_LINT) AV/Background/*.js
	-@$(JS_LINT) AV/Design/*.js

TODOlintAV:
	@echo 'linting AVs'
	-@$(JS_LINT) AV/Binary/*.js
	-@$(JS_LINT) AV/General/*.js
	-@$(JS_LINT) AV/List/*.js
	-@$(JS_LINT) AV/Sorting/*.js
	-@$(JS_LINT) AV/Hashing/*.js
	-@$(JS_LINT) AV/Searching/*.js
	-@$(JS_LINT) AV/Sorting/*.js

lintExe:
	@echo 'linting KA Exercises'
	-@$(JS_LINT) Exercises/AlgAnal/*.js
	-@$(JS_LINT) Exercises/Background/*.js
	-@$(JS_LINT) Exercises/Binary/*.js
	-@$(JS_LINT) Exercises/Design/*.js
	-@$(JS_LINT) Exercises/General/*.js
	-@$(JS_LINT) Exercises/Graph/*.js
	-@$(JS_LINT) Exercises/Hashing/*.js
	-@$(JS_LINT) Exercises/Indexing/*.js
	-@$(JS_LINT) Exercises/List/*.js
	-@$(JS_LINT) Exercises/RecurTutor/*.js
	-@$(JS_LINT) Exercises/RecurTutor2/*.js
	-@$(JS_LINT) Exercises/Sorting/*.js

TODOlintlib:
	@echo 'linting libraries'
	-@$(JS_LINT) lib/odsaUtils.js
	-@$(JS_LINT) lib/odsaAV.js
	-@$(JS_LINT) lib/odsaMOD.js
	-@$(JS_LINT) lib/gradebook.js
	-@$(JS_LINT) lib/registerbook.js
	-@$(JS_LINT) lib/conceptMap.js

jsonlint:
	@$(JSON_LINT) $(wildcard AV/Background/*.json)
	@$(JSON_LINT) $(wildcard config/*.json)
	@$(JSON_LINT) $(wildcard config/Old/*.json)
	@$(JSON_LINT) $(wildcard AV/Design/*.json)


PYTHON_FILES := server.py $(wildcard tools/*.py)
PYTHON_FILES += $(wildcard RST/ODSAextensions/*/*/*.py)
pyLint: venv
	$(ACTIVATE) && $(PYTHON_LINT) $(PYTHON_FILES)
	# $(PYTHON_LINT) SourceCode/Python/**/*.py # These are python 2!!!

rst2json: venv
	$(VENV_PYTHON) tools/rst2json.py

JS_FNAMES = odsaUtils odsaAV odsaKA odsaMOD gradebook registerbook JSAV
JS_FILES = $(foreach fname, $(JS_FNAMES), lib/$(fname).js)
JS_MIN_FILES = $(foreach fname, $(JS_FNAMES), lib/$(fname)-min.js)

CSS_FNAMES = site odsaMOD odsaStyle odsaAV odsaKA gradebook  
CSS_FILES = $(foreach fname, $(CSS_FNAMES), lib/$(fname).css)
CSS_MIN_FILES = $(foreach fname, $(CSS_FNAMES), lib/$(fname)-min.css)

min: $(JS_MIN_FILES) $(CSS_MIN_FILES) 
	@echo $(MINIFY_MSG)

lib/%-min.js:: lib/%.js
	@$(JS_MINIFY) $^ > $@

lib/%-min.css:: lib/%.css
	@$(CSS_MINIFY) $^ > $@

# one file has a special minify process:
lib/odsaAV-min.css: lib/normalize.css lib/odsaAV.css
	@$(CSS_MINIFY) lib/normalize.css lib/odsaAV.css > lib/odsaAV-min.css

CONFIGS := $(wildcard config/*.json)
ALL_BOOKS := $(patsubst config/%.json,%,$(CONFIGS))

SLIDE_BOOKS = $(filter %slides %Slides,$(ALL_BOOKS))
SLIDE_BOOKS += CS5040Master
BOOKS = $(filter-out $(SLIDE_BOOKS),$(ALL_BOOKS))
.PHONY: $(BOOKS) $(SLIDE_BOOKS)

allbooks: Everything CS2 CS3 PL CS3slides CS3notes CS4104 VisFormalLang

# A Static-Pattern Rule for making Books
$(BOOKS): % : config/%.json min venv
	$(VENV_PYTHON) $(CONFIG_SCRIPT) $< --no-lms
	@echo "Created an eBook in Books/: $@"

$(SLIDE_BOOKS) : % : config/%.json min venv
	$(VENV_PYTHON) $(CONFIG_SCRIPT) --slides $< --no-lms
	@echo "Created an Slide-eBook in Books/: $@"


# Target eBooks with unique recipies below:::
CS3notes: min venv
	$(VENV_PYTHON) $(CONFIG_SCRIPT) config/CS3slides.json -b CS3notes --no-lms

CS3F18notes: min venv
	$(VENV_PYTHON) $(CONFIG_SCRIPT) config/CS3F18slides.json --no-lms -b CS3F18notes --no-lms

CS5040notes: min venv
	$(VENV_PYTHON) $(CONFIG_SCRIPT) config/CS5040slides.json -b CS5040notes --no-lms

CS5040MasterN: min venv
	$(VENV_PYTHON) $(CONFIG_SCRIPT) config/CS5040Master.json -b CS5040MasterN --no-lms

CS3SS18notes: min venv
	$(VENV_PYTHON) $(CONFIG_SCRIPT) config/CS3SS18slides.json -b CS3SS18notes --no-lms

