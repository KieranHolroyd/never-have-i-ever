# !/usr/bin/env python3
# encoding: utf-8
import json

def append_to_file(filename, text):
    with open(filename, 'a') as file:
        file.write(text)
file_name = 'localhost.har'
f = open(file_name)
j = json.load(f)
entries = j['log']['entries']
for e in entries:
    if e['_resourceType'] == 'websocket' and '_webSocketMessages' in e.keys():
        messages = e['_webSocketMessages']
        for m in messages:
            if len(m['data']) > 1:
              if(m['type'] == 'send'):
                append_to_file('messages.txt', m['data'] + '\n')
                