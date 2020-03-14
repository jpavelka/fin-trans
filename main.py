import os
import sys
import argparse
import json

from jinja2 import Template

from utils import is_ext
from pc_convert import convert_transactions


def render_template(trans_path, cat_path, html_name, auto_open):
    fnames = [f for f in os.listdir(trans_path) if is_ext(f, 'json')]
    trans = []
    for fname in fnames:
        trans += json.load(open(os.path.join(trans_path, fname), 'r'))
    cats = json.load(open(os.path.join(cat_path, 'meta-cats.json'), 'r'))
    with open('template.html', 'r') as f:
        template_str = ''.join(f.readlines())
    template = Template(template_str)
    with open(html_name, 'w') as f:
        f.writelines(template.render(trans_data=trans, meta_cats=cats))
    if auto_open:
        if sys.platform in ['win32', 'win64']:
            os.system('start {}'.format(html_name))
        else:
            os.system('open {}'.format(html_name))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--trans_path', default='all_trans')
    parser.add_argument('--cat_path', default='')
    parser.add_argument('--html_name', default='rendered.html')
    parser.add_argument('--auto_open', default=False, action='store_true')
    args = parser.parse_args()
    convert_transactions('all_trans')
    render_template(**vars(args))
