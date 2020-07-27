import sys, codecs, string, os, io
from operator import itemgetter
from collections import OrderedDict

# A lightweight language-universal stemmer for alphabetic languages
#
# 5/13/14 Paul McNamee

# Implemented stemmers:
# - truncation after prefix ofn characters (trunc-n)
# - least-frequently observed character n-gram (lcn-n)
#
# Refs:
# - McNamee et al., "Addressing morphological variation in alphabetic languages."
#   SIGIR 2009, http://doi.acm.org/10.1145/1571941.1571957
#
# - McNamee et al., "Don't hav a stemmer?: be un+concern+ed." SIGIR 2008,
#   http://doi.acm.org/10.1145/1390334.1390518

# ----------------------------------------------------------------
# Some utils

# Take a string and perform some normalization on it. For example,
# lower-casing, removing whitespace from the ends, and punctuation removal.

def normalize(str):
	return str.strip().decode('utf-8').lower().strip(string.punctuation)

def text2words(text):
	return filter(lambda x: len(x) > 0, [normalize(w) for w in text.split()])

# Python's collections.Counter might be reasonable here
def bow(listofwords):
	bag = {}
	for w in listofwords:
		bag[w] = bag.setdefault(w,0) + 1
	return [(w,c) for (w,c) in bag.iteritems()]

# Produce *set* of character n-grams for a string
# Could consider a list of non-unique strings, but for this application a set is ok
def ngrams(str, n=4, pad=True):
	if pad:
		str = '_' + str + '_'
	s = set()
	for i in xrange(0,len(str)-n+1):
		s.add(str[i:i+n])
	return s

# Just a utility method to load a file in memory
def slurp(fname, encoding='utf-8'):
	lines = []
	f = io.open(fname, 'r', encoding=encoding, newline='\n')
	## NB: io.open ignores \u2028 and \u2029 (thankfully)
	try:
		lines = f.readlines()
	finally:
		f.close()
	return lines

# ----------------------------------------------------------------
# This class defines the API shared by all stemmers. Its stemmer
# simply returns the surgace form unchanged.

class Stemmer(object):
	# Train a stemmer from a file of sample text, which may be large
	def train(self, fname=None):
		pass

	def load(self, fname=None):
		pass

	def save(self, fname=None):
		pass
	
	def stem(self, word):
		return normalize(word)
	
	# Produce a mapped bag froa raw document
	def maptext(self, rawtext):
		return self.mapbag(bow(text2words(rawtext)))
	
	# Given as input a bag of surface forms, return a new bag where words that
	# stem to the same represntative are combined, and the most common raw form is selected
	def mapbag(self, listoftuples):
		steminfo = {}
		for (word, count) in listoftuples:
			s = self.stem(word)
			steminfo.setdefault(s,[]).append((word, count))
		for k in steminfo.iterkeys():
			steminfo[k].sort(key=lambda x: x[1], reverse=True)
		# Now we have {'boat':[(boating,4),(boats,2),(boatman,1)], ...}
		# We want: [(boating,7), (fisherman,3), ...]
		return [(v[0][0],sum(b for (a,b) in v),k) for (k,v) in steminfo.iteritems()]
	
	def bag2tbl(self, bag):
		tbl = {}
		for (repr, cnt, stem) in bag:
			tbl[stem] = (repr, cnt)
		return tbl
	
	def surface2tuple(self, surface, tbl):
		return tbl.get(self.stem(surface), ('OOV', 0))
	
	def surface2rep(self, surface, tbl):
		tup = self.surface2tuple(surface, tbl)
		return tup[0]

# ----------------------------------------------------------------
# Truncates surface forms after the first n characters

class TruncStemmer(Stemmer):
	def __init__(self, name, order=5):
		self.name = name
		self.order = order
		self.reptbl = {} # representations table; KHS addition
	
	def train(self, text):
		for line in text:
			for w in text2words(line): # convert line to words
				tw = normalize(w)[0:self.order]
				# this series of ifs could be made more efficient, perhaps with a setdefault call? --KHS
				if tw in self.reptbl:
					if w in self.reptbl[tw]:
						self.reptbl[tw][w] += 1
					else:
						self.reptbl[tw][w] = 1
				else:
					self.reptbl[tw] = {}
					self.reptbl[tw][w] = 1
		for r in self.reptbl:
			self.reptbl[r] = OrderedDict(sorted(self.reptbl[r].items(), key=itemgetter(1), reverse=True))
			# print "reptbl[" + r + "]=" + self.reptbl[r]
	
	def stem(self, word):
		norm = normalize(word)[0:self.order]
		reps = self.reptbl.get(norm, {'OOV':0}).keys()
		# if reps[0] != word:
		#	print "TruncStemmer.stem " + norm + " (as in " + word + ") to " + reps[0]
		return reps[0]

# ----------------------------------------------------------------
# Picks least common n-gram as representative

class LCNStemmer(Stemmer):
	def __init__(self, name, order=5):
		self.name = name
		self.order = order
		self.cftbl = {} # n-gram to count mapping
		self.reptbl = {} # representatives table; KHS addition
	
	def train(self, text):
		for line in text:
			for w in text2words(line): # convert line to words
				self.cftbl[w] = self.cftbl.setdefault(w,0) + 1 # add counts of the words
				ngramsforw = ngrams(w, n=self.order, pad=True) # convert words to padded n-grams
				for ng in ngramsforw:
					self.cftbl[ng] = self.cftbl.setdefault(ng,0) + 1 # add counts of the n-grams
					# this next could be made more efficient, perhaps with a setdefault call? --KHS
					if ng in self.reptbl:
						if w in self.reptbl[ng]:
							self.reptbl[ng][w] += 1
						else:
							self.reptbl[ng][w] = 1
					else:
						self.reptbl[ng] = {}
						self.reptbl[ng][w] = 1
		for ng in self.reptbl:
			self.reptbl[ng] = OrderedDict(sorted(self.reptbl[ng].items(), key = itemgetter(1), reverse=True))
			# print "reptbl[" + ng + "] = ", self.reptbl[ng]
	
	# Write LCNStemmer object to file. The real key is the frequency table,
	# but the order is also important. I considered marshal, but opted against.
	def save(self, fname=None):
		if fname is None:
			fname = self.name + '.lcn' + self.order
		file = open(fname, 'wb')
		pickle.dump(self, file)
		file.flush() # (lame, lame: surely close() should do this)
		os.fsync(file.fileno()) # (lame, lame: surely shouldn't be needed)
		file.close()

	# Read an LCNStemmer object from a binary file and return it.
	def load(self, fname=None):
		if fname is None:
			fname = self.name + '.lcn' + self.order
		file = open(fname, 'rb')
		x = pickle.load(file)
		file.close()
		return x
	
	# Consider all n-grams for the input word, and select the rarest to use as
	# a representative stem
	def stem(self, word):
		nword = normalize(word)
		pword = '_' + nword + '_'
		ngs = ngrams(nword, n=self.order, pad=False)
		freqs = [(ng, self.cftbl.get(ng, 0)) for ng in ngs]
		freqs.sort(key=lambda x: x[0], cmp=lambda x,y: cmp(pword.find(x), pword.find(y))) # for secondary sort
		freqs.sort(key=lambda x: x[1])
		if len(freqs) > 0:
			# return freqs[0][0]
			reps = self.reptbl.get(freqs[0][0], {'OOV':0}).keys()
			# if reps[0] != word:
			#	print "stemmer.stem " + freqs[0][0] + " (as in " + word +") to " + reps[0]
			return reps[0]
		else:
			return nword[0:self.order] # take first

if __name__ == '__main__':
	reload(sys)
	sys.setdefaultencoding('utf-8')
	sys.stdout = codecs.getwriter('utf-8')(sys.stdout)
	sys.stdout.encoding = 'utf-8'

	testfile = 'shakespeare/tragedies_romeoandjuliet'
	testtext = slurp(testfile)

	trunc = 3
	stemmer = TruncStemmer('trunc-romeo', order=trunc)
	stemmer.train(testtext)
	stembag = stemmer.maptext('\n'.join(testtext))
	stemtbl = stemmer.bag2tbl(stembag)
	stembag.sort() # alphabetical
	for (surface, count, stem) in stembag:
		sys.stdout.write("%s(%d) " % (surface, count))
	print('')

	stemmer2 = LCNStemmer('LCN-romeo', order=trunc)
	stemmer2.train(testtext)
	stembag2 = stemmer2.maptext('\n'.join(testtext))
	stemtbl2 = stemmer2.bag2tbl(stembag2)
	stembag2.sort() # alphabetical
	for (surface, count, stem) in stembag2:
		sys.stdout.write("%s(%d) " % (surface, count))
	print('')
	
	for word in text2words('\n'.join(testtext)):
		s = stemmer2.stem(word)
		sys.stdout.write("%s %s [" % (word, s))
		for ng in ngrams(word, n=stemmer2.order, pad=False):
			sys.stdout.write("%s %s," % (ng, stemmer2.cftbl.get(ng, 0)))
		sys.stdout.write("]\n")

# end 'o file
