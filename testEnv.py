import os
import sys
import shutil
from pprint import pprint
''' A quick test of how well ODSA will handle in the current environment.
All output lines should output 'True' for a good environment.
'''

# print("PATH=")
# pprint(os.getenv("PATH").split(os.pathsep))

print('.pyVenv' in sys.prefix, ": .pyVenv in sys.prefix")
print('.pyVenv' in sys.exec_prefix, ": .pyVenv in sys.exec_prefix")
print('.pyVenv' not in sys.base_prefix, ": .pyVenv NOT in sys.base_prefix")

joinedPath = ';'.join(sys.path)

def isInPath(s):
	print(s in joinedPath, ":", s, "in sys.path")
isInPath("hieroglyph" + os.sep + "src")
isInPath(".pyVenv")
isInPath(".pyVenv" + os.sep + "lib" + os.sep + "site-packages")

# print("sys.path=")
# pprint(sys.path)

hasSphinx = False
try:
	import sphinx
	hasSphinx = 'sphinx' in sys.modules
except:
	pass

print(hasSphinx, ": sphinx in sys.modules")

def isCommandFound(s):
	cmdFound = shutil.which(s) is not None
	print(cmdFound, ":", s, "command visible from python")	
isCommandFound('make')
isCommandFound('sphinx-build')


pythonFound = shutil.which('python') is not None
print(pythonFound, ": python can run another python")
pyVenvFound = '.pyVenv' in str(shutil.which('python'))
print(pyVenvFound, ": python can run another VENV python")

print()
