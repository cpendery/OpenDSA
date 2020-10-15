''' A quick test of how well ODSA will handle in the current environment.
All output lines should output 'True' for a good environment.
'''

import os
import sys
import shutil
from importlib.util import find_spec

def testInPath(s):
	pathStr = '\n'.join(sys.path)
	print(s in pathStr, ":", s, "in sys.path")

def testIsCommandFound(s):
	cmdFound = shutil.which(s) is not None
	print(cmdFound, ":", s, "command visible from python")	

# print("PATH=", *os.getenv("PATH").split(os.pathsep), sep='\n   ')
# print("sys.path=", *sys.path, sep='\n   ')

print("### Requirements for OpenDSA: ")
print('.pyVenv' in sys.prefix, ": .pyVenv in sys.prefix")
print('.pyVenv' in sys.exec_prefix, ": .pyVenv in sys.exec_prefix")
print('.pyVenv' not in sys.base_prefix, ": .pyVenv NOT in sys.base_prefix")

testInPath("hieroglyph" + os.sep + "src")
testInPath(".pyVenv")
testInPath(".pyVenv" + os.sep + "lib" + os.sep + "site-packages")

hasSphinx = find_spec("sphinx") is not None
print(hasSphinx, ": sphinx in sys.modules")

testIsCommandFound('make')
testIsCommandFound('python')
testIsCommandFound('sphinx-build')

pyVenvFound = '.pyVenv' in str(shutil.which('python'))
print(pyVenvFound, ": python command keeps the VENV python")

print("### Minify tools needed for production environment:")
testIsCommandFound('uglifyjs')
testIsCommandFound('cleancss')

print("### Optional Linting tools:")
testIsCommandFound('pylint')
testIsCommandFound('jsonlint')
testIsCommandFound('eslint')
testIsCommandFound('csslint')

print()
