from __future__ import division
from dynamic_wordclouds import create_idf_vector_from_doc_locs
import sys,codecs
#Unicode fix
if __name__ == '__main__':
    reload(sys)
    sys.setdefaultencoding('utf-8')
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout)
    sys.stdout.encoding = 'utf-8'

one_doc_per_line=True
try:
    #raise ImportError #HARDCODE test for python 2.6 compatibility
    import argparse
    parser = argparse.ArgumentParser(description='Create a JSON idf vector for use with the dynamic wordclouds.')
    parser.add_argument('--output',action='store',help='Where the output JSON file should be written.',default='generated_idf_vector.json')
    parser.add_argument('--docs',action='store',help='List of text files used to generate the idf vector -- one document per line, multiple text files allowed',nargs='*')
    parser.add_argument('--files',action='store',help='List of text files used to generate the idf vector -- one document per text file, multiple text files required',nargs='*')

    args = vars(parser.parse_args())
    output_loc = args['output']
    if args['docs']:
        docs = args['docs']
        one_doc_per_line=True
    elif args['files']:
        docs = args['files']
        one_doc_per_line=False
    else:
        print "No documents specified to create IDF vector from, exiting."
        import sys
        sys.exit()
except ImportError: #If you don't have argparse installed (e.g., python 2.6)
    from optparse import OptionParser
    usage = """
    usage: create_idf_vector.py [-h] [--output OUTPUT] --docs [DOCS [DOCS ...]]

    Create a JSON idf vector for use with the dynamic wordclouds."""
    parser = OptionParser(usage=usage)
    parser.add_option('--output',action='store',help='Where the output JSON file should be written.',default='generated_idf_vector.json')
    parser.add_option('--docs',action='store',help='List of text files used to generate the idf vector -- one document per line, multiple text files allowed')
    parser.add_option('--files',action='store',help='List of text files used to generate the idf vector -- one document per text file')
    (options,args) = parser.parse_args()
    output_loc = options.output
    if options.docs:
        docs = [options.docs] + args
        one_doc_per_line=True
    elif options.files:
        docs = [options.files] + args
        one_doc_per_line=False
    else:
        print "No documents specified to create IDF vector from, exiting."
        import sys
        sys.exit()

idf = create_idf_vector_from_doc_locs( docs, one_doc_per_line=one_doc_per_line, required_count=1 )

import json
json.dump(idf,open(output_loc,'w'))
