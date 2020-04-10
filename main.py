import os
import sys
import argparse

import flask
from jinja2 import Template

from utils import is_ext, get_dir_filenames, load_from_json, path_join, save_str
from pc_convert import convert_transactions


def render_template(trans_path, pc_trans_path, cat_path, html_name, auto_open, serve, convert_all):
    convert_transactions(input_trans_path=pc_trans_path, output_trans_path=trans_path, convert_all=convert_all)
    fnames = [f for f in get_dir_filenames(trans_path) if is_ext(f, 'json')]
    trans = []
    for fname in fnames:
        trans.append(load_from_json(path_join(trans_path, fname)))
    cats = load_from_json(path_join(cat_path, 'meta-cats.json'))
    with open('web/template.html', 'r') as f:
        template_str = ''.join(f.readlines())
    template = Template(template_str)
    rendered = template.render(trans_data=trans, meta_cats=cats, main_js=_file_contents('web/main.js'),
                               plot_js=_file_contents('web/plot.js'), table_js=_file_contents('web/table.js'))
    if serve:
        return rendered
    else:
        save_str(rendered, html_name, content_type='text/html')
        if auto_open:
            if sys.platform in ['win32', 'win64']:
                os.system('start {}'.format(html_name))
            else:
                os.system('open {}'.format(html_name))


def cloud_main(*args):
    return render_template(trans_path=os.environ['TRANS_PATH'], pc_trans_path=os.environ['PC_TRANS_PATH'],
                           cat_path=os.environ['CAT_PATH'], html_name=os.environ['OUTPUT_PATH'],
                           auto_open=False, serve=False, convert_all=False)


def _file_contents(fname):
    with open(fname, 'r') as f:
        contents = f.read()
    return contents


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--trans_path', default='transactions')
    parser.add_argument('--pc_trans_path', default='pc_trans')
    parser.add_argument('--cat_path', default='')
    parser.add_argument('--html_name', default='rendered.html')
    parser.add_argument('--auto_open', default=False, action='store_true')
    parser.add_argument('--serve', default=False, action='store_true')
    parser.add_argument('--convert_all', default=False, action='store_true')
    args = parser.parse_args()
    if args.serve:
        app = flask.Flask(__name__)
        @app.route('/', methods=['GET'])
        def server_main():
            return render_template(**vars(args))
        app.run('0.0.0.0', debug=True)
    else:
        render_template(**vars(args))
