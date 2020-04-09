import os
import csv
import json
import itertools
import re
import copy
from tempfile import gettempdir

from utils import is_ext, strip_ext, get_dir_filenames, save_as_json, copy_file, path_join

standard_fields = {'date', 'account', 'description', 'category', 'tags', 'amount', 'comment', 'source', 'id', 'type',
                   'hidden_notes'}


def convert_transactions(input_trans_path, output_trans_path, convert_all=False):
    input_fnames = get_dir_filenames(input_trans_path)
    csv_fnames = [strip_ext(f) for f in input_fnames if is_ext(f, 'csv')]
    if convert_all:
        fnames_to_convert = csv_fnames
    else:
        output_fnames = get_dir_filenames(output_trans_path)
        json_fnames = [strip_ext(f) for f in output_fnames if is_ext(f, 'json')]
        fnames_to_convert = [f + '.csv' for f in (set(csv_fnames) - set(json_fnames))]
    temp_dir = gettempdir()
    for fname in fnames_to_convert:
        temp_fname = path_join(temp_dir, fname)
        copy_file(path_join(input_trans_path, fname), temp_fname)
        with open(temp_fname, 'r') as f:
            csv_reader = csv.DictReader(_lower_first(f))
            trans = json.loads(json.dumps([r for r in csv_reader]))
            trans = standardize_transactions(trans, fname)
            save_as_json(trans, path_join(output_trans_path, strip_ext(fname) + '.json'))
        os.remove(temp_fname)


def _lower_first(iterator):
    return itertools.chain([next(iterator).lower()], iterator)


def standardize_transactions(trans, fname):
    drop_ids = []
    all_new_transactions = []
    for t_counter, t in enumerate(trans):
        t, new_transactions = fill_transaction(t, fname, t_counter)
        if new_transactions is not None:
            drop_ids.append(t['id'])
            all_new_transactions += new_transactions
    final_transactions = [t for t in trans if t['id'] not in drop_ids] + all_new_transactions
    final_transactions = [_format_tags(t) for t in final_transactions]
    final_transactions = [{k: t[k] for k in t if t[k] not in [None, '', []]} for t in final_transactions]
    return final_transactions


def _format_tags(t):
    if isinstance(t['tags'], str):
        t['tags'] = [x for x in t['tags'].split(',') if x != '']
    for k in set(t.keys() - standard_fields):
        t['tags'].append(k)
    return t


def fill_transaction(t, source, t_id):
    t['source'] = source
    t['id'] = f'trans{t_id}'
    t['amount'] = float(t['amount'])
    t['type'] = 'income' if t['amount'] > 0 else 'expense'
    t['amount'] = abs(t['amount'])
    if not re.search('::', t['description']):
        return t, None
    spl = t['description'].split('::')
    t['description'] = spl[0]
    if len(spl) % 2 != 1:
        msg = f'Mismatch in parsing transaction description "{t["description"]}"'
        raise ValueError(msg)
    num_field_alts = int((len(spl) - 1) / 2)
    num_trans = max(len(spl[2 * alt + 2].split(';;')) for alt in range(num_field_alts))
    if num_trans == 1:
        for alt in range(num_field_alts):
            key = spl[2 * alt + 1]
            value = re.sub('^{', '', re.sub('}$', '', spl[2 * alt + 2]))
            t[key] = value
        return t, None
    new_transactions = [copy.deepcopy(t) for _ in range(num_trans)]
    for alt in range(num_field_alts):
        key = spl[2 * alt + 1]
        value = re.sub('^{', '', re.sub('}$', '', spl[2 * alt + 2]))
        values = value.split(';;')
        for new_i, new_t in enumerate(new_transactions):
            new_t[key] = values[new_i if len(values) > new_i else -1]
            new_t = fill_transaction(new_t, source, f'{t_id}_{new_i}')
    return t, new_transactions
