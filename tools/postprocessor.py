# postprocessor.py is a refactored version of the OpenDSA preprocessor created by efouh.
# This script is designed to be run after Sphinx has generated all the HTML files.
# It corrects the chapter and section numbers for titles and hyperlinks using the data
# contained in page_chapter.json

import sys
import os
import re
import codecs
import json
import xml.dom.minidom as minidom
from pprint import pprint
from xml.etree.ElementTree import ElementTree, SubElement, Element
from bs4 import BeautifulSoup, element
from bs4.element import NavigableString
from collections import defaultdict
import tarfile
import shutil
import urlparse

__author__ = 'breakid'


# Reads the starting section number and section prefix from index.rst
def parse_index_rst(source_dir):
  # Read contents of index.rst
  with open(source_dir + 'index.rst', 'r') as index_rst_file:
    index_rst = index_rst_file.readlines()

  directive = False
  sectnum = 0
  prefix = ''

  for line in index_rst:
    if '.. sectnum::' in line or '.. chapnum::' in line:
      directive = True
    elif ':prefix:' in line:
      prefix = re.split('prefix:', line, re.IGNORECASE)[1].strip()
    elif ':start:' in line:
      sectnum = int(re.split('start:', line, re.IGNORECASE)[1]) - 1

  if not directive:
    print 'Error: No .. sectnum:: or .. chapnum:: directive in index.rst. Please include the directive and try again.'
    sys.exit(1)

  return (sectnum, prefix)


# Updates the index.html page
def update_index_html(dest_dir, sectnum):
  # Process index.html separately from the modules files
  with open(dest_dir + 'index.html', 'r') as index_html_file:
    index_html = index_html_file.readlines()

  for line_num, line in enumerate(index_html):
    #inject css rule to remove haiku's orange bullets
    if '</head>' in line:
      index_html[line_num] = line.replace('</head>','<style>\nul li {\n\tbackground: none;\n\tlist-style-type: none;\n}\n</style>\n</head>')
    elif 'class="section"' in line:
      sectnum += 1
    elif 'RegisterBook' in line:
      #remove registerbook page from TOC
      index_html[line_num] = ''
    elif 'CreateCourse' in line:
      #remove createcourse page from TOC
      index_html[line_num] = ''
    elif 'hide-from-toc' in line:
      #remove stub chapter title 
      if '<h1>' in index_html[line_num-1]:
        index_html[line_num-1] = ''
    elif 'class="toctree-l' in line and 'Gradebook' not in line and 'TODO List' not in line:
      title = re.split('>', re.split('</a>', line, re.IGNORECASE)[0], re.IGNORECASE)[-1]
      new_title = '%s.' % sectnum + title
      index_html[line_num] = line.replace(title, new_title)

  # Write the modified contents back to index.html
  with open(dest_dir + 'index.html', 'wb') as index_html_file:
    index_html_file.writelines(index_html)


# Update the headers and navigation hyperlinks in module HTML files
def update_mod_html(file_path, data, prefix):
  # Read contents of module HTML file
  with open(file_path, 'r') as html_file:
    html = html_file.readlines()

  mod_name = os.path.splitext(os.path.basename(file_path))[0]

  ignore_mods = ['index', 'Gradebook', 'search', 'RegisterBook', 'CreateCourse']

  link_pattern = re.compile('<a.+href="(?P<href>.*).html">(?P<text>.*)</a>')
  title_pattern = re.compile('<title>(?P<title>.*)</title>')
  h2_pattern = re.compile('<span>(?P<header>.*)</span>')
  header_pattern = re.compile('<h\d>(?P<header>.*)<a')

  for line_num, line in enumerate(html):
    if 'id="prevmod"' in line or 'id="nextmod"' in line or 'id="prevmod1"' in line or 'id="nextmod1"' in line:
      m = re.search(link_pattern, line)
      link_text = m.group('text')
      link_mod = m.group('href')

      if link_mod in data and link_mod not in ['index', 'Gradebook', 'ToDo', 'RegisterBook', 'CreateCourse']:
        new_link_text = '%s.' % data[link_mod][1] + link_text
        html[line_num] = line.replace(link_text, new_link_text)

      if link_mod in ['RegisterBook']:
        html[line_num] = line.replace(link_text, "")

      if link_mod in ['CreateCourse']:
        html[line_num] = line.replace(link_text, "")


    if '&lt;anchor-text&gt;' in line:
      line_args = re.split('&lt;anchor-text&gt;|&lt;/anchor-text&gt;', line)
      texts = re.split(':', line_args[1])
      if len(texts) == 2:
        html[line_num] = line.replace(texts[1] + '</em>', texts[0] + '</em>')
      html[line_num] = html[line_num].replace(line_args[1], '')
      html[line_num] = html[line_num].replace('&lt;anchor-text&gt;', '')
      html[line_num] = html[line_num].replace('&lt;/anchor-text&gt;', '') 

    if mod_name in data and mod_name not in ignore_mods:
      (chap_title, chap_num) = data[mod_name]

      if '<title>' in line:
        title = re.search(title_pattern, line).group('title')
        numbered_title = '%s.' % chap_num + title
        html[line_num] = line.replace(title, numbered_title)
      elif '<h2 class="heading"><span>' in line:
        heading = re.search(h2_pattern, line).group('header')
        header = '%s %s %s' % (prefix, chap_num, chap_title)
        html[line_num] = line.replace(heading, header)

      if re.search(header_pattern, line):
        section_title = re.search(header_pattern, line).group('header')
        new_section_title = '%s.' % chap_num + section_title
        html[line_num] = line.replace(section_title, new_section_title)

  # Replace original HTML file with modified contents
  with open(file_path, 'wb') as html_file:
    html_file.writelines(html)


def update_TOC(source_dir, dest_dir, data = None):
  (sectnum, prefix) = parse_index_rst(source_dir)

  update_index_html(dest_dir, sectnum)

  if not data:
    # Load the JSON data used to store chapter number and title information
    with open('page_chapter.json', 'r') as page_chapter_file:
      data = json.load(page_chapter_file)

  html_files = [file for file in os.listdir(dest_dir) if file.endswith('.html')]

  for file in html_files:
    update_mod_html(dest_dir + file, data, prefix)


def update_TermDef(glossary_file, terms_dict):
  with codecs.open(glossary_file, 'r', 'utf-8') as html_glossary:
    mod_data = html_glossary.readlines()
  i = 0
  while i < len(mod_data):
    line = mod_data[i].strip()
    if line.startswith('<dt'):
      tokens = re.split('</dt>', line)
      token = re.split('>', tokens[0])
      term = token[len(token) -1]
      if term in terms_dict:
        term_def = ''
        i += 1
        endofdef = False
        while (i < len(mod_data) and not endofdef):
          if '</dd>' in  mod_data[i]:  
            term_def += mod_data[i].split('</dd>')[0] + '</dd>'
            endofdef = True
          else:
            term_def += mod_data[i]
          i += 1
        terms_dict[term] = str(term_def)
        i-= 1
    i += 1
    
triple_up = re.compile(r'^\.\.[\/\\]\.\.[\/\\]\.\.[\/\\]')
def break_up_fragments(path, exercises, modules, url_index, book_name):
  # Read contents of module HTML file
  with codecs.open(path, 'r', 'utf-8') as html_file:
    html = html_file.read()
  
  # Get the module name and create its subfolder
  mod_name = os.path.splitext(os.path.basename(path))[0]
  print "Found HTML file:", mod_name
  
  # Strip out the script, style, link, and meta tags
  
  soup = BeautifulSoup(html, "lxml")
  
  TAGS = [ ('script', 'src'), ('link', 'href'), ('img', 'src') ]
  
  # Find all of the scripts, links, images, etc. that we might need
  for tag_name, tag_url in TAGS+[('div', 'data-frame-src')]:
    for a_tag in soup(tag_name):
      if a_tag.has_attr(tag_url):
        if triple_up.match(a_tag[tag_url]):
          a_tag[tag_url] = 'OpenDSA/' + a_tag[tag_url][len('../../../'):]
        elif a_tag[tag_url].startswith('_static/'):
          a_tag[tag_url] = 'OpenDSA/Books/'+book_name+'/html/'+a_tag[tag_url]
      
      
  '''
  Keep actual <head>
  Strip out <div class='header'> content
  
  Strip out any JS/CSS that's related to the slideshow
  
  
  Break it up according to the exercises
  
    Text
    Question
    
    Text
    Question
    
    Text
    
  Different folder
  
  '''
  
  # Redirect href urls
  for link in soup.find_all('a'):
    if 'href' not in link.attrs:
        # Really? No href? Is that even valid HTML?
        continue
    href = link['href']
    # Skip dummy urls redirecting to itself
    if href == '#':
      continue
    elif href.startswith('#'):
      # Do something with an internal page link
      continue
    elif href.startswith('mailto:'):
      continue
    elif href.startswith('http://'):
      continue
    elif href.startswith('../'):
      continue
    elif href.endswith('.rst'):
      continue
    else:
      if '#' in href:
        external, internal = href.split('#', 1)
      else:
        external, internal = href, ''
      if external.endswith('.html'):
        # Snip off the ".html"
        external = external[:-5]
        # Map it to the proper folder in OpenEdX
        external = url_index.get(external, external)
        # Force it to approach it from the top
        link['href'] = '../../'+'#'.join((external,internal))
        
      # Do something with the actual href
  
  # Move header scripts out of header, kill header
  header_tag = soup.find('div', class_='header')
  for bit in reversed(header_tag.contents):
    if bit.name in ('script', 'link'):
      header_tag.next_sibling.insert_before(bit.extract())
  header_tag.extract()
  
  # Remove unnecessary parts of the HTML
  for class_name in ('topnav', 'bottomnav', 'footer'):
    soup.find('div', class_=class_name).extract()
  soup.find('img', alt='nsf').extract()
  
  # Collect out the slide-specific JS/CSS
  slide_scripts = defaultdict(list)
  for tag_name, tag_url in TAGS:
    for a_tag in soup.find_all(tag_name):
      if a_tag.has_attr(tag_url) and a_tag[tag_url].startswith('OpenDSA/AV/'):
        name = os.path.splitext(os.path.basename(a_tag[tag_url]))[0]
        slide_scripts[name].append(a_tag.extract())
  
  # Breaking file into components
  soup_content = soup.find('div', class_='section')
  section_divs = soup_content.contents
  found_counter = 0
  exercise_data = {}
  all_divs = []
  if section_divs:
    # Process the fragments in two passes
    fragments = []
    fragment_components = []
    total = 0
    
    extractions = []
    while section_divs:
      extractions.append(section_divs[0].extract())
    # In the first pass, we find all of the problems and group them into fragments
      # If we find a slideshow or practice exercise, then start a new fragment
    for section in extractions:
      # If we find a slideshow or practice exercise, then start a new fragment
      #section = section.extract()
      fragment_components.append(section)
      all_divs.append(section)
      if isinstance(section, element.Tag) and section.has_attr('id') and section['id'] in exercises:
        name = section['id']
        print "Found:", name
        fragments.append((name, fragment_components))
        fragment_components = []
        exercise_data[name] = {key: section[key] for key in section.attrs}
        total += 1
        
    # Then we write out each grouping with the proper name and JS/CSS
    for section_id, fragment in fragments:
        seq = '-{0:02d}'.format(1+found_counter) if total > 0 else ''
        filename = '{}{}.html'.format(mod_name, seq)
        path_html = os.path.join(os.path.dirname(path), '..', 'lti_html', filename)
        # Write it out, preserving unicode
        for i, bit in enumerate(fragment):
          soup_content.insert(i,bit)
        sss_div = soup.new_tag('div', id='SLIDE-SPECIFIC-SCRIPTS')
        soup_content.insert_before(sss_div)
        if section_id in slide_scripts:
          if section_id in ('quicksortCON', 'bubblesortCON'):
            for a_script in slide_scripts[section_id.replace('CON', 'CODE')]:
              sss_div.insert(0, a_script)
              print "Added", a_script, "to", filename
          for a_script in slide_scripts[section_id]:
            sss_div.insert(0, a_script)
            print "Added", a_script, "to", filename
        with codecs.open(path_html, 'w', 'utf-8') as o:
          o.write(unicode(soup))
        for bit in soup_content:
          bit.extract()
        sss_div.extract()
        found_counter += 1
  else:
    print "Failed to find any 'div' tags with a 'section' class."
    path_html = os.path.join(os.path.dirname(path), '{}-{}.html'.format(mod_name, found_counter))
    with codecs.open(path_html, 'w', 'utf-8') as o:
      o.writelines(html)
  print "\t Had ", 1+found_counter, "parts"
  
  # Delete the file on the way out
  #os.remove(path)
  return exercise_data
    
def pretty_print_xml(data, file_path):
    ElementTree(data).write(file_path)
    xml = minidom.parse(file_path)
    with open(file_path, 'w') as resaved_file:
        # [23:] omits the stupid xml header
        resaved_file.write(xml.toprettyxml()[23:])
    
def make_lti(config):
  dest_dir = config.book_dir + config.rel_book_output_path
  # Iterate through all of the existing files
  ignore_files = ('Gradebook.html', 'search.html', 'conceptMap.html',
                  'genindex.html', 'RegisterBook.html', 'index.html')
  html_files = [path for path in os.listdir(dest_dir)
                if path.endswith('.html') and path not in ignore_files]
  
  lti_folder = os.path.join(dest_dir, '..', 'lti_html')
  shutil.rmtree(lti_folder, ignore_errors=True)
  os.makedirs(lti_folder)
  
  exercises = {}
  url_index = {
    section_data['long_name'] : '{}/{}'.format(chapter_name, section_name.replace('/', '_'))
    for chapter_name, sections in config.chapters.items()
    for section_name, section_data in sections.items()
  }
  url_index['genindex'] = 'Table_of_Contents/Table_of_Contents'
  url_index['search'] = 'Table_of_Contents/Table_of_Contents'
  for chapter_name, sections in config.chapters.items():
    for section_name, section_data in sections.items():
      path = os.path.join(dest_dir, section_data['long_name']+".html")
      exercises[path] = break_up_fragments(path, section_data['exercises'], tuple(html_files)+ignore_files, url_index, config.book_name)

def main(argv):
  if len(argv) != 3:
    print "ERROR. Usage: %s <source directory> <destination directory>\n" % argv[0]
    sys.exit(1)

  update_TOC(argv[1], argv[2])


if __name__ == "__main__":
   sys.exit(main(sys.argv))
